import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      // Top wallets by lifetime_earned
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('user_id, balance, lifetime_earned, referral_code')
        .order('lifetime_earned', { ascending: false })
        .limit(50);
      if (error) throw error;

      const ids = (wallets || []).map((w) => w.user_id);
      let profiles = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ids);
        profiles = p || [];
      }
      const pMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

      // referral counts
      const { data: refs } = await supabase
        .from('referrals')
        .select('referrer_id, status');
      const refCount = {};
      (refs || []).forEach((r) => {
        if (r.status !== 'completed') return;
        refCount[r.referrer_id] = (refCount[r.referrer_id] || 0) + 1;
      });

      const board = (wallets || []).map((w, i) => ({
        rank: i + 1,
        user_id: w.user_id,
        name: pMap[w.user_id]?.full_name || pMap[w.user_id]?.email?.split('@')[0] || 'Student',
        referral_code: w.referral_code,
        lifetime_earned: w.lifetime_earned || 0,
        balance: w.balance || 0,
        referrals: refCount[w.user_id] || 0,
        is_you: w.user_id === user.id,
      }));

      const you = board.find((b) => b.is_you) || null;

      return res.status(200).json({ leaderboard: board, you });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('leaderboard API error:', err);
    res.status(500).json({ error: err.message });
  }
}
