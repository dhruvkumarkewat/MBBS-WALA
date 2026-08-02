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
      const wallet = await ensureWallet(user);
      const { data: txns, error: tErr } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false })
        .limit(50);
      if (tErr) throw tErr;

      const { data: allCredit } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at, type')
        .eq('user_id', user.id)
        .in('type', ['referral_reward', 'challenge_reward', 'bonus'])
        .order('created_at', { ascending: true });

      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({
          key,
          label: d.toLocaleString('en-IN', { month: 'short' }),
          amount: 0,
        });
      }
      (allCredit || []).forEach((t) => {
        if (!t.created_at) return;
        const d = new Date(t.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = months.find((m) => m.key === key);
        if (bucket) bucket.amount += t.amount || 0;
      });

      return res.status(200).json({
        wallet,
        transactions: txns || [],
        analytics: {
          monthly: months,
          total_earned: wallet.lifetime_earned || 0,
          total_withdrawn: wallet.lifetime_withdrawn || 0,
          available: wallet.balance || 0,
        },
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('wallet API error:', err);
    res.status(500).json({ error: err.message });
  }
}
