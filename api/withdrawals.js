import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';
import { ensureWallet } from './wallet-helpers.js';

const MIN_WITHDRAW = 500;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { amount, method, account_detail } = req.body || {};
      const amt = Number(amount);
      if (!amt || Number.isNaN(amt) || amt < MIN_WITHDRAW) {
        return res.status(400).json({ error: `Minimum withdrawal is ₹${MIN_WITHDRAW}` });
      }
      if (!method || !account_detail) {
        return res.status(400).json({ error: 'method and account_detail required' });
      }

      const wallet = await ensureWallet(user);
      if ((wallet.balance || 0) < amt) {
        return res.status(400).json({ error: 'Insufficient wallet balance' });
      }

      const newBal = wallet.balance - amt;
      const { error: wErr } = await supabase
        .from('wallets')
        .update({
          balance: newBal,
          lifetime_withdrawn: (wallet.lifetime_withdrawn || 0) + amt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (wErr) throw wErr;

      const now = new Date().toISOString();
      const { data: wd, error: wdErr } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: amt,
          method,
          account_detail,
          status: 'pending',
          created_at: now,
        })
        .select()
        .single();
      if (wdErr) throw wdErr;

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: -amt,
        balance_after: newBal,
        description: `Withdrawal request via ${method}`,
        meta: { withdrawal_id: wd.id, method },
        created_at: now,
      });

      return res.status(201).json(wd);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('withdrawals API error:', err);
    res.status(500).json({ error: err.message });
  }
}
