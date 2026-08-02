import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';
import { ensureWallet } from './wallet-helpers.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const { data: progress } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user.id);

      const pMap = Object.fromEntries((progress || []).map((p) => [p.challenge_id, p]));

      const list = (challenges || []).map((c) => {
        const p = pMap[c.id];
        return {
          ...c,
          progress: p?.progress || 0,
          status: p?.status || 'active',
          completed_at: p?.completed_at || null,
          percent: Math.min(100, Math.round(((p?.progress || 0) / Math.max(1, c.target_count)) * 100)),
        };
      });

      return res.status(200).json({ challenges: list });
    }

    // Mark share challenge progress
    if (req.method === 'POST') {
      const { challenge_slug } = req.body || {};
      if (!challenge_slug) return res.status(400).json({ error: 'challenge_slug required' });

      const { data: ch } = await supabase
        .from('challenges')
        .select('*')
        .eq('slug', challenge_slug)
        .maybeSingle();
      if (!ch) return res.status(404).json({ error: 'Challenge not found' });
      if (ch.challenge_type !== 'share') {
        return res.status(400).json({ error: 'This challenge completes via referrals' });
      }

      let { data: uc } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_id', ch.id)
        .maybeSingle();

      if (uc?.status === 'completed') {
        return res.status(200).json({ ok: true, already: true });
      }

      if (!uc) {
        const ins = await supabase
          .from('user_challenges')
          .insert({
            user_id: user.id,
            challenge_id: ch.id,
            progress: ch.target_count,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (ins.error) throw ins.error;
        uc = ins.data;
      } else {
        await supabase
          .from('user_challenges')
          .update({
            progress: ch.target_count,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', uc.id);
      }

      await ensureWallet(user);
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();
      const newBal = (wallet.balance || 0) + (ch.reward_amount || 0);
      await supabase
        .from('wallets')
        .update({
          balance: newBal,
          lifetime_earned: (wallet.lifetime_earned || 0) + (ch.reward_amount || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'challenge_reward',
        amount: ch.reward_amount || 0,
        balance_after: newBal,
        description: `Challenge completed: ${ch.title}`,
        meta: { challenge_id: ch.id },
        created_at: new Date().toISOString(),
      });

      return res.status(200).json({ ok: true, reward: ch.reward_amount });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('challenges API error:', err);
    res.status(500).json({ error: err.message });
  }
}
