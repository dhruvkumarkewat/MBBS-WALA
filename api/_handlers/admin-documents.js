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
        .from('student_documents')
        .select('*')
        .eq('student_id', student_id)
        .order('id', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { student_id, title, file_url } = req.body || {};
      if (!student_id || !title) return res.status(400).json({ error: 'student_id and title required' });

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
        .from('student_documents')
        .insert({
          student_id: Number(student_id),
          file_name: title,
          file_url: file_url || '',
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      await logActivity(user.id, 'Uploaded Document', 'student', student_id, { title });
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      const { data: doc } = await supabase
        .from('student_documents')
        .select('*, student:student_counselling(assigned_to)')
        .eq('id', id)
        .maybeSingle();
      if (!doc) return res.status(404).json({ error: 'Not found' });
      if (staff.role !== 'super_admin' && doc.student?.assigned_to !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { error } = await supabase.from('student_documents').delete().eq('id', id);
      if (error) throw error;

      await logActivity(user.id, 'Deleted Document', 'student', String(doc.student_id), { id });
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-documents error', err);
    res.status(500).json({ error: err.message });
  }
}
