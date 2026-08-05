import supabase from './db-client.js';
import { setCors } from './_auth.js';
import {
  requireSuperAdmin,
  requireStaff,
  logActivity,
  notifyAssignment,
  getStaffProfile,
} from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const ctx = await requireStaff(req, res);
      if (!ctx) return;
      const isSuper = ctx.staff.role === 'super_admin';

      let query = supabase.from('purchases').select('*').order('id', { ascending: false });
      if (!isSuper) {
        query = query.eq('assigned_staff_id', ctx.user.id);
      }
      const { data: purchases, error } = await query;
      if (error) throw error;

      const studentIds = [...new Set((purchases || []).map((p) => p.student_id).filter(Boolean))];
      const staffIds = [...new Set((purchases || []).map((p) => p.assigned_staff_id).filter(Boolean))];

      let students = [];
      let staff = [];
      if (studentIds.length) {
        const { data } = await supabase
          .from('student_counselling')
          .select('id, full_name, email, phone, neet_rank, state, counselling_status, payment_status, user_id')
          .in('id', studentIds);
        students = data || [];
      }
      if (staffIds.length) {
        const { data } = await supabase
          .from('staff_profiles')
          .select('user_id, name, email')
          .in('user_id', staffIds);
        staff = data || [];
      }

      const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
      const staffMap = Object.fromEntries(staff.map((s) => [s.user_id, s]));

      const enriched = (purchases || []).map((p) => ({
        ...p,
        student: p.student_id ? studentMap[p.student_id] || null : null,
        counsellor: p.assigned_staff_id ? staffMap[p.assigned_staff_id] || null : null,
      }));

      return res.status(200).json(enriched);
    }

    const ctx = await requireSuperAdmin(req, res);
    if (!ctx) return;

    if (req.method === 'POST') {
      const body = req.body || {};
      const now = new Date().toISOString();
      const amount = Number(body.amount) || 0;
      const itemName = body.item_name || 'Counselling Package';
      const assignedStaffId = body.assigned_staff_id || null;

      let studentId = body.student_id != null ? Number(body.student_id) : null;
      let student = null;

      // Optionally create student with purchase
      if (!studentId && body.full_name) {
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
          purchased_course: body.item_type === 'course' ? itemName : '',
          purchased_counselling: body.item_type !== 'course' ? itemName : '',
          payment_status: body.status || 'paid',
          payment_amount: amount,
          assigned_to: assignedStaffId,
          counselling_status: assignedStaffId ? 'assigned' : 'new',
          created_at: now,
          updated_at: now,
        };
        const { data: created, error: cErr } = await supabase
          .from('student_counselling')
          .insert(row)
          .select()
          .single();
        if (cErr) throw cErr;
        student = created;
        studentId = created.id;
        await logActivity(ctx.user.id, 'Created Student from Purchase', 'student', studentId);
      } else if (studentId) {
        const { data: existing } = await supabase
          .from('student_counselling')
          .select('*')
          .eq('id', studentId)
          .maybeSingle();
        student = existing;
        if (existing) {
          const patch = {
            payment_status: body.status || 'paid',
            payment_amount: amount,
            purchased_counselling:
              body.item_type !== 'course'
                ? itemName
                : existing.purchased_counselling,
            purchased_course:
              body.item_type === 'course' ? itemName : existing.purchased_course,
            updated_at: now,
          };
          if (assignedStaffId) {
            patch.assigned_to = assignedStaffId;
            patch.counselling_status = 'assigned';
          }
          const { data: updated } = await supabase
            .from('student_counselling')
            .update(patch)
            .eq('id', studentId)
            .select()
            .single();
          student = updated || existing;
        }
      }

      const { data, error } = await supabase
        .from('purchases')
        .insert({
          user_id: body.user_id || student?.user_id || null,
          student_id: studentId,
          item_type: body.item_type || 'counselling',
          item_name: itemName,
          amount,
          status: body.status || 'paid',
          assigned_staff_id: assignedStaffId,
          created_at: now,
        })
        .select()
        .single();
      if (error) throw error;

      let staffName = '';
      if (assignedStaffId) {
        const sp = await getStaffProfile(assignedStaffId);
        staffName = sp?.name || '';
        await notifyAssignment({
          student,
          staffId: assignedStaffId,
          staffName,
          packageName: itemName,
          assignedByName: ctx.staff.name || 'Super Admin',
        });
      }

      await logActivity(ctx.user.id, 'Recorded Purchase', 'purchase', data.id, {
        student_id: studentId,
        assigned_staff_id: assignedStaffId,
      });

      return res.status(201).json({ ...data, student, notifications_sent: !!assignedStaffId });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const { id, assigned_staff_id, status } = body;
      if (!id) return res.status(400).json({ error: 'id required' });

      const { data: existing, error: eErr } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (eErr) throw eErr;
      if (!existing) return res.status(404).json({ error: 'Purchase not found' });

      const update = {};
      if (status !== undefined) update.status = status;
      if (assigned_staff_id !== undefined) update.assigned_staff_id = assigned_staff_id || null;

      const { data, error } = await supabase
        .from('purchases')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      let student = null;
      if (existing.student_id) {
        const patch = { updated_at: new Date().toISOString() };
        if (assigned_staff_id !== undefined) {
          patch.assigned_to = assigned_staff_id || null;
          patch.counselling_status = assigned_staff_id ? 'assigned' : 'unassigned';
        }
        if (status === 'paid') patch.payment_status = 'paid';
        const { data: st } = await supabase
          .from('student_counselling')
          .update(patch)
          .eq('id', existing.student_id)
          .select()
          .single();
        student = st;
      }

      if (assigned_staff_id && assigned_staff_id !== existing.assigned_staff_id) {
        const sp = await getStaffProfile(assigned_staff_id);
        await notifyAssignment({
          student: student || { full_name: `Student #${existing.student_id}`, user_id: existing.user_id },
          staffId: assigned_staff_id,
          staffName: sp?.name,
          packageName: existing.item_name,
          assignedByName: ctx.staff.name || 'Super Admin',
        });
        await logActivity(ctx.user.id, 'Assigned Counsellor to Purchase', 'purchase', id, {
          staff_id: assigned_staff_id,
        });
      }

      return res.status(200).json({ ...data, student });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-purchases error', err);
    res.status(500).json({ error: err.message });
  }
}
