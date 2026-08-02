import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const { data: badges, error } = await supabase
        .from('badges')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const { data: owned } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);

      const ownedMap = Object.fromEntries((owned || []).map((o) => [o.badge_id, o]));

      const list = (badges || []).map((b) => ({
        ...b,
        earned: !!ownedMap[b.id],
        earned_at: ownedMap[b.id]?.earned_at || null,
      }));

      return res.status(200).json({
        badges: list,
        earned_count: list.filter((b) => b.earned).length,
        total: list.length,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('badges API error:', err);
    res.status(500).json({ error: err.message });
  }
}
