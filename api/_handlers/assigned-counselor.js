import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return; // requireUser sends 401

    if (req.method === 'GET') {
      // 1. Get student's counselling record
      const { data: counselling } = await supabase
        .from('student_counselling')
        .select('assigned_to')
        .eq('user_id', user.id)
        .maybeSingle();

      let counselorId = counselling?.assigned_to;

      // 2. If no counselor assigned, fallback to a super_admin
      if (!counselorId) {
        const { data: admin } = await supabase
          .from('staff')
          .select('id')
          .eq('role', 'super_admin')
          .limit(1)
          .maybeSingle();
        
        if (admin) {
          counselorId = admin.id;
        }
      }

      if (!counselorId) {
        return res.status(404).json({ error: 'No counselor available' });
      }

      // 3. Get counselor's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', counselorId)
        .maybeSingle();

      return res.status(200).json({
        id: counselorId,
        full_name: profile?.full_name || 'Assigned Counselor',
        avatar_url: profile?.avatar_url
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('assigned-counselor error', err);
    res.status(500).json({ error: err.message });
  }
}
