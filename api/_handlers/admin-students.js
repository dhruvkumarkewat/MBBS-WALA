import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireStaff, logActivity, notifyAssignment, getStaffProfile } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireStaff(req, res);
    if (!ctx) return;
    const { user, staff } = ctx;
    const isSuper = staff.role === 'super_admin';

    if (req.method === 'GET') {
      const { id, status, q, assigned_to } = req.query;

      // ── 1. Single Student Details ──────────────────────────────────────
      if (id) {
        let student = null;

        // Try numeric ID lookup
        const numId = Number(id);
        if (!isNaN(numId) && numId > 0) {
          const { data: scData } = await supabase
            .from('student_counselling')
            .select('*')
            .eq('id', numId)
            .maybeSingle();
          if (scData) student = scData;
        }

        // If not found by numeric ID, try lookup by user_id or email
        if (!student) {
          const { data: scList } = await supabase
            .from('student_counselling')
            .select('*')
            .or(`user_id.eq.${id},email.eq.${id}`)
            .order('updated_at', { ascending: false })
            .limit(1);
          if (scList && scList.length > 0) {
            student = scList[0];
          }
        }

        // If still not found, check profiles / students table
        if (!student) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (prof) {
            // Auto-create/upsert into student_counselling
            const newRow = {
              user_id: prof.id,
              full_name: prof.full_name || prof.name || (prof.email ? prof.email.split('@')[0] : 'Student'),
              email: prof.email || '',
              phone: prof.phone || '',
              neet_rank: prof.neet_rank ?? (prof.rank ? Number(prof.rank) : null),
              score: prof.neet_score ?? (prof.score ?? (prof.marks ? Number(prof.marks) : null)),
              state: prof.domicile_state || prof.state || prof.domicile || '',
              category: prof.category || 'General',
              exam: prof.exam || 'NEET UG',
              purchased_course: prof.preferred_course || 'MBBS',
              counselling_status: 'new',
              payment_status: prof.payment_status || 'pending',
              created_at: prof.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const { data: inserted } = await supabase
              .from('student_counselling')
              .insert(newRow)
              .select()
              .single();
            if (inserted) student = inserted;
          }
        }

        if (!student) {
          return res.status(404).json({ error: 'Student not found' });
        }

        if (!isSuper && student.assigned_to !== user.id) {
          return res.status(403).json({ error: 'Not authorized to view this student' });
        }

        // Load all child relations using student.id
        const studentNumId = Number(student.id);
        const [notes, followups, docs, messages, purchases] = await Promise.all([
          supabase.from('counselling_notes').select('*').eq('student_id', studentNumId).order('id', { ascending: false }),
          supabase.from('counselling_followups').select('*').eq('student_id', studentNumId).order('due_at', { ascending: true }),
          supabase.from('student_documents').select('*').eq('student_id', studentNumId).order('id', { ascending: false }),
          supabase.from('student_messages').select('*').eq('student_id', studentNumId).order('id', { ascending: true }),
          supabase.from('purchases').select('id, student_id, user_id, item_type, item_name, amount, status, notes, created_at').eq('student_id', studentNumId).order('id', { ascending: false }),
        ]);

        // Enrich student with Google avatar_url from profiles
        if (student.user_id) {
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', student.user_id)
              .maybeSingle();
            if (prof?.avatar_url) {
              student = { ...student, avatar_url: prof.avatar_url };
            }
          } catch {
            // ignore — avatar is non-critical
          }
        }

        return res.status(200).json({
          student,
          notes: notes.data || [],
          followups: followups.data || [],
          documents: docs.data || [],
          messages: messages.data || [],
          purchases: purchases.data || [],
        });
      }

      // ── 2. All Students List (Deduplicated & Unified) ────────────────────
      // Fetch primary counselling records
      let scQuery = supabase.from('student_counselling').select('*').order('updated_at', { ascending: false });
      if (!isSuper) {
        scQuery = scQuery.eq('assigned_to', user.id);
      } else if (assigned_to) {
        scQuery = scQuery.eq('assigned_to', assigned_to);
      }

      const [scRes, staffRes, profRes, stRes] = await Promise.all([
        scQuery,
        supabase.from('staff_profiles').select('user_id, email, role'),
        isSuper && !assigned_to ? supabase.from('profiles').select('*').order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
        isSuper && !assigned_to ? supabase.from('students').select('*').order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
      ]);

      const scList = scRes.data || [];
      const staffList = staffRes.data || [];
      const staffUserIds = new Set(staffList.map((s) => s.user_id).filter(Boolean));
      const staffEmails = new Set(staffList.map((s) => s.email?.toLowerCase().trim()).filter(Boolean));

      // Build unified student map by unique identifier
      const studentMap = new Map();

      // Helper to generate unique key
      const getKey = (item) => {
        if (item.user_id) return `user:${item.user_id}`;
        if (item.email && item.email.trim()) return `email:${item.email.trim().toLowerCase()}`;
        if (item.phone && item.phone.trim()) return `phone:${item.phone.trim()}`;
        return `id:${item.id}`;
      };

      // 1. Process student_counselling records
      for (const row of scList) {
        const key = getKey(row);
        if (!studentMap.has(key)) {
          studentMap.set(key, { ...row });
        } else {
          // Merge with higher priority info
          const existing = studentMap.get(key);
          const merged = {
            ...existing,
            ...row,
            id: existing.id || row.id,
            assigned_to: existing.assigned_to || row.assigned_to || null,
            counselling_status:
              existing.counselling_status !== 'new' && existing.counselling_status !== 'unassigned'
                ? existing.counselling_status
                : row.counselling_status,
            payment_status: existing.payment_status === 'paid' ? 'paid' : row.payment_status || existing.payment_status,
            payment_amount: Math.max(existing.payment_amount || 0, row.payment_amount || 0),
          };
          studentMap.set(key, merged);
        }
      }

      // 2. Include students from profiles table if super admin
      if (isSuper && !assigned_to && profRes?.data) {
        for (const p of profRes.data) {
          const emailLower = (p.email || '').toLowerCase().trim();
          // Skip if pure staff/counsellor account
          if (staffUserIds.has(p.id) || (emailLower && staffEmails.has(emailLower))) {
            continue;
          }

          const key = getKey({ user_id: p.id, email: p.email, phone: p.phone, id: p.id });
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              id: p.id,
              user_id: p.id,
              full_name: p.full_name || p.name || (p.email ? p.email.split('@')[0] : 'Student'),
              email: p.email || '',
              phone: p.phone || '',
              neet_rank: p.neet_rank ?? (p.rank ? Number(p.rank) : null),
              score: p.neet_score ?? (p.score ?? (p.marks ? Number(p.marks) : null)),
              state: p.domicile_state || p.state || p.domicile || '',
              category: p.category || 'General',
              exam: p.exam || 'NEET UG',
              purchased_course: p.preferred_course || 'MBBS',
              purchased_counselling: '',
              counselling_status: 'new',
              payment_status: p.payment_status || 'pending',
              payment_amount: 0,
              assigned_to: null,
              created_at: p.created_at || new Date().toISOString(),
              updated_at: p.updated_at || new Date().toISOString(),
            });
          } else {
            // Enrich existing with latest profile details if empty
            const existing = studentMap.get(key);
            if (!existing.full_name || existing.full_name === 'Student') {
              existing.full_name = p.full_name || p.name || existing.full_name;
            }
            if (!existing.phone && p.phone) existing.phone = p.phone;
            if (existing.neet_rank == null && p.neet_rank != null) existing.neet_rank = p.neet_rank;
            if (existing.score == null && p.neet_score != null) existing.score = p.neet_score;
            if (!existing.state && (p.domicile_state || p.state)) existing.state = p.domicile_state || p.state;
          }
        }
      }

      // 3. Include students from students table if super admin
      if (isSuper && !assigned_to && stRes?.data) {
        for (const s of stRes.data) {
          const emailLower = (s.email || '').toLowerCase().trim();
          if (staffUserIds.has(s.user_id) || (emailLower && staffEmails.has(emailLower))) {
            continue;
          }

          const key = getKey({ user_id: s.user_id || s.id, email: s.email, phone: s.phone, id: s.id });
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              id: s.id,
              user_id: s.user_id || s.id,
              full_name: s.full_name || s.name || (s.email ? s.email.split('@')[0] : 'Student'),
              email: s.email || '',
              phone: s.phone || '',
              neet_rank: s.neet_rank,
              score: s.neet_score ?? s.score,
              state: s.domicile_state || s.state || '',
              category: s.category || 'General',
              exam: 'NEET UG',
              purchased_course: s.preferred_course || 'MBBS',
              purchased_counselling: '',
              counselling_status: 'new',
              payment_status: 'pending',
              payment_amount: 0,
              assigned_to: null,
              created_at: s.created_at || new Date().toISOString(),
              updated_at: s.updated_at || new Date().toISOString(),
            });
          }
        }
      }

      // Convert map to array
      let list = Array.from(studentMap.values());

      // Apply Filters
      if (status && status !== 'all') {
        if (status === 'unassigned') {
          list = list.filter((s) => !s.assigned_to || s.counselling_status === 'unassigned');
        } else {
          list = list.filter((s) => s.counselling_status === status);
        }
      }

      if (q) {
        const queryLower = q.toLowerCase().trim();
        list = list.filter((s) => {
          const nameMatch = (s.full_name || '').toLowerCase().includes(queryLower);
          const emailMatch = (s.email || '').toLowerCase().includes(queryLower);
          const phoneMatch = (s.phone || '').includes(queryLower);
          const stateMatch = (s.state || '').toLowerCase().includes(queryLower);
          const rankMatch = s.neet_rank != null && String(s.neet_rank).includes(queryLower);
          return nameMatch || emailMatch || phoneMatch || stateMatch || rankMatch;
        });
      }

      // Sort by updated_at descending
      list.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());

      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      // Super: create student or assign; Sub: notes/followups handled elsewhere
      if (!isSuper) return res.status(403).json({ error: 'Only super admin can create students' });
      const body = req.body || {};
      const now = new Date().toISOString();
      const row = {
        user_id: body.user_id || null,
        full_name: body.full_name,
        email: body.email || '',
        phone: body.phone || '',
        neet_rank: body.neet_rank != null ? Number(body.neet_rank) : null,
        score: body.score != null ? Number(body.score) : null,
        state: body.state || '',
        category: body.category || 'General',
        exam: body.exam || 'NEET UG',
        purchased_course: body.purchased_course || '',
        purchased_counselling: body.purchased_counselling || '',
        payment_status: body.payment_status || 'pending',
        payment_amount: body.payment_amount != null ? Number(body.payment_amount) : 0,
        assigned_to: body.assigned_to || null,
        counselling_status: body.assigned_to ? 'assigned' : 'new',
        created_at: now,
        updated_at: now,
      };
      if (!row.full_name) return res.status(400).json({ error: 'full_name required' });

      // Check if student already exists by user_id or email
      if (row.user_id || row.email) {
        const { data: existing } = await supabase
          .from('student_counselling')
          .select('id')
          .or(`user_id.eq.${row.user_id || 'null'},email.eq.${row.email || 'nonexistent@mbbswala.in'}`)
          .limit(1);

        if (existing && existing.length > 0) {
          const { data: updated, error: uErr } = await supabase
            .from('student_counselling')
            .update({ ...row, updated_at: now })
            .eq('id', existing[0].id)
            .select()
            .single();
          if (uErr) throw uErr;
          await logActivity(user.id, 'Updated Student', 'student', updated.id, { name: updated.full_name });
          return res.status(200).json(updated);
        }
      }

      const { data, error } = await supabase.from('student_counselling').insert(row).select().single();
      if (error) throw error;
      await logActivity(user.id, 'Created Student', 'student', data.id, { name: data.full_name });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'id required' });

      // Load existing record by numeric ID or UUID
      let existing = null;
      const numId = Number(id);
      if (!isNaN(numId) && numId > 0) {
        const { data } = await supabase.from('student_counselling').select('*').eq('id', numId).maybeSingle();
        if (data) existing = data;
      }

      if (!existing) {
        const { data: list } = await supabase
          .from('student_counselling')
          .select('*')
          .or(`user_id.eq.${id},email.eq.${id}`)
          .limit(1);
        if (list && list.length > 0) existing = list[0];
      }

      // If still not in student_counselling, create from profile
      if (!existing) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (prof) {
          const { data: created } = await supabase
            .from('student_counselling')
            .insert({
              user_id: prof.id,
              full_name: prof.full_name || prof.name || (prof.email ? prof.email.split('@')[0] : 'Student'),
              email: prof.email || '',
              phone: prof.phone || '',
              neet_rank: prof.neet_rank,
              score: prof.neet_score ?? prof.score,
              state: prof.domicile_state || prof.state || '',
              category: prof.category || 'General',
              exam: prof.exam || 'NEET UG',
              purchased_course: prof.preferred_course || 'MBBS',
              counselling_status: body.assigned_to ? 'assigned' : 'new',
              assigned_to: body.assigned_to || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          existing = created;
        }
      }

      if (!existing) return res.status(404).json({ error: 'Student not found' });
      if (!isSuper && existing.assigned_to !== user.id) {
        return res.status(403).json({ error: 'Not your assigned student' });
      }

      const update = { updated_at: new Date().toISOString() };

      if (isSuper) {
        [
          'full_name',
          'email',
          'phone',
          'neet_rank',
          'score',
          'state',
          'category',
          'exam',
          'purchased_course',
          'purchased_counselling',
          'payment_status',
          'payment_amount',
          'assigned_to',
          'counselling_status',
          'user_id',
        ].forEach((k) => {
          if (body[k] !== undefined) update[k] = body[k];
        });
        if (body.assigned_to !== undefined && body.assigned_to !== existing.assigned_to) {
          update.counselling_status = body.assigned_to
            ? body.counselling_status || 'assigned'
            : body.counselling_status || 'unassigned';
          await logActivity(user.id, body.assigned_to ? 'Assigned Student' : 'Unassigned Student', 'student', String(existing.id), {
            to: body.assigned_to || null,
            from: existing.assigned_to || null,
          });
        }
      } else {
        // Sub admin limited fields
        if (body.counselling_status !== undefined) {
          const allowed = ['assigned', 'in_progress', 'follow_up', 'completed', 'admitted'];
          if (!allowed.includes(body.counselling_status)) {
            return res.status(400).json({ error: 'Invalid status' });
          }
          update.counselling_status = body.counselling_status;
          if (body.counselling_status === 'completed' || body.counselling_status === 'admitted') {
            await supabase
              .from('staff_profiles')
              .update({
                total_sessions: (staff.total_sessions || 0) + 1,
                successful_admissions:
                  body.counselling_status === 'admitted'
                    ? (staff.successful_admissions || 0) + 1
                    : staff.successful_admissions,
              })
              .eq('user_id', user.id);
            await logActivity(
              user.id,
              body.counselling_status === 'admitted' ? 'Closed Counselling' : 'Marked Counselling Complete',
              'student',
              String(existing.id)
            );
          } else {
            await logActivity(user.id, 'Changed Student Status', 'student', String(existing.id), {
              status: body.counselling_status,
            });
          }
        }
        if (body.contacted) {
          update.updated_at = new Date().toISOString();
          await logActivity(user.id, 'Contacted Student', 'student', String(existing.id));
        }
      }

      const { data, error } = await supabase
        .from('student_counselling')
        .update(update)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;

      // Dual notification: student + sub-admin when counsellor is assigned
      if (
        isSuper &&
        body.assigned_to &&
        body.assigned_to !== existing.assigned_to
      ) {
        const sp = await getStaffProfile(body.assigned_to);
        await notifyAssignment({
          student: data,
          staffId: body.assigned_to,
          staffName: sp?.name,
          packageName: data.purchased_counselling || data.purchased_course,
          assignedByName: staff.name || 'Super Admin',
        });
      }

      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-students error', err);
    res.status(500).json({ error: err.message });
  }
}
