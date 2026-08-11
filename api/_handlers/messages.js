import supabase from './db-client.js';
import { setCors, verifyAuth } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await verifyAuth(req, res);
    if (!user) return; // verifyAuth sends 401

    // Fetch the student_counselling record for this user
    const { data: counselling } = await supabase
      .from('student_counselling')
      .select('id, assigned_to')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!counselling) {
      return res.status(404).json({ error: 'No counselling profile found' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('student_messages')
        .select('*')
        .eq('student_id', counselling.id)
        .order('id', { ascending: true });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { content } = req.body || {};
      if (!content?.trim()) {
        return res.status(400).json({ error: 'content required' });
      }

      const { data, error } = await supabase
        .from('student_messages')
        .insert({
          student_id: counselling.id,
          sender_id: user.id,
          sender: 'student',
          message: content.trim(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('messages error', err);
    res.status(500).json({ error: err.message });
  }
}
