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

    if (req.method === 'GET') {
      const { student_id } = req.query;
      if (!student_id) return res.status(400).json({ error: 'student_id required' });

      const { data: st } = await supabase
        .from('student_counselling')
        .select('*')
        .eq('id', student_id)
        .maybeSingle();
      if (!st) return res.status(404).json({ error: 'Not found' });
      if (staff.role !== 'super_admin' && st.assigned_to !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data, error } = await supabase
        .from('student_messages')
        .select('*')
        .eq('student_id', student_id)
        .order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { student_id, message } = req.body || {};
      if (!student_id || !message?.trim()) {
        return res.status(400).json({ error: 'student_id and message required' });
      }

      const { data: st } = await supabase
        .from('student_counselling')
        .select('*')
        .eq('id', student_id)
        .maybeSingle();
      if (!st) return res.status(404).json({ error: 'Not found' });
      if (staff.role !== 'super_admin' && st.assigned_to !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data, error } = await supabase
        .from('student_messages')
        .insert({
          student_id: Number(student_id),
          sender_id: user.id,
          sender_role: staff.role,
          message: message.trim(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from('student_counselling')
        .update({ last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', student_id);

      await logActivity(user.id, 'Contacted Student', 'student', student_id, { via: 'chat' });
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-messages error', err);
    res.status(500).json({ error: err.message });
  }
}
