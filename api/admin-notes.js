import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireStaff, logActivity } from './_admin.js';

async function assertStudentAccess(staff, studentId) {
  const { data } = await supabase
    .from('student_counselling')
    .select('*')
    .eq('id', studentId)
    .maybeSingle();
  if (!data) return null;
  if (staff.role !== 'super_admin' && data.assigned_to !== staff.user_id) return null;
  return data;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireStaff(req, res);
    if (!ctx) return;
    const { user, staff } = ctx;

    if (req.method === 'GET') {
      const { student_id } = req.query;
      if (!student_id) return res.status(400).json({ error: 'student_id required' });
      const st = await assertStudentAccess(staff, student_id);
      if (!st) return res.status(403).json({ error: 'Forbidden' });
      const { data, error } = await supabase
        .from('counselling_notes')
        .select('*')
        .eq('student_id', student_id)
        .order('id', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { student_id, note } = req.body || {};
      if (!student_id || !note?.trim()) return res.status(400).json({ error: 'student_id and note required' });
      const st = await assertStudentAccess(staff, student_id);
      if (!st) return res.status(403).json({ error: 'Forbidden' });

      const { data, error } = await supabase
        .from('counselling_notes')
        .insert({
          student_id: Number(student_id),
          staff_id: user.id,
          note: note.trim(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from('student_counselling')
        .update({
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          counselling_status:
            st.counselling_status === 'new' || st.counselling_status === 'assigned'
              ? 'in_progress'
              : st.counselling_status,
        })
        .eq('id', student_id);

      await logActivity(user.id, 'Added Counselling Note', 'student', student_id);
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-notes error', err);
    res.status(500).json({ error: err.message });
  }
}
