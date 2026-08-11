import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireStaff, logActivity } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireStaff(req, res);
    if (!ctx) return;
    const { user, staff } = ctx;
    const isSuper = staff.role === 'super_admin';

    if (req.method === 'GET') {
      let query = supabase.from('counselling_followups').select('*, student:student_counselling(full_name, email)').order('due_at', { ascending: true });
      if (!isSuper) query = query.eq('staff_id', user.id);
      if (req.query.status) query = query.eq('status', req.query.status);
      if (req.query.student_id) query = query.eq('student_id', req.query.student_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { student_id, due_at, note } = req.body || {};
      if (!student_id || !due_at) return res.status(400).json({ error: 'student_id and due_at required' });

      const { data: st } = await supabase
        .from('student_counselling')
        .select('*')
        .eq('id', student_id)
        .maybeSingle();
      if (!st) return res.status(404).json({ error: 'Student not found' });
      if (!isSuper && st.assigned_to !== user.id) return res.status(403).json({ error: 'Forbidden' });

      const { data, error } = await supabase
        .from('counselling_followups')
        .insert({
          student_id: Number(student_id),
          staff_id: user.id,
          staff_name: staff.full_name || staff.email,
          due_at: new Date(due_at).toISOString(),
          status: 'pending',
          note: note || '',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from('student_counselling')
        .update({ counselling_status: 'follow_up', updated_at: new Date().toISOString() })
        .eq('id', student_id);

      await logActivity(user.id, 'Scheduled Follow-up', 'student', student_id, { due_at });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status, note } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      const { data: existing } = await supabase
        .from('counselling_followups')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (!isSuper && existing.staff_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

      const update = {};
      if (status) {
        update.status = status;
        if (status === 'done') update.completed_at = new Date().toISOString();
      }
      if (note !== undefined) update.note = note;

      const { data, error } = await supabase
        .from('counselling_followups')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logActivity(user.id, 'Updated Follow-up', 'followup', id, { status });
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-followups error', err);
    res.status(500).json({ error: err.message });
  }
}
