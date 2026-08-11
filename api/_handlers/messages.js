import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return; // requireUser sends 401

    // Fetch the student_counselling record for this user
    const { data: counsellingData } = await supabase
      .from('student_counselling')
      .select('id, assigned_to')
      .eq('user_id', user.id)
      .order('id', { ascending: false })
      .limit(1);

    let counselling = counsellingData?.[0];

    if (!counselling) {
      const fullName = user.user_metadata?.full_name || user.email || 'Student';
      const { data: newCounselling } = await supabase
        .from('student_counselling')
        .insert({ user_id: user.id, full_name: fullName, counselling_status: 'new' })
        .select('id, assigned_to')
        .single();
      counselling = newCounselling;
    }

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

      if (counselling.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: counselling.assigned_to,
          title: `New message from ${counselling.full_name || 'Student'}`,
          description: content.trim().substring(0, 100),
          type: 'chat',
          read: false,
          created_at: new Date().toISOString()
        });
      }

      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('messages error', err);
    res.status(500).json({ error: err.message });
  }
}
