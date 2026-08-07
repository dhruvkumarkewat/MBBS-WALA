import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireSuperAdmin, logActivity } from './_admin.js';
import { ensureWallet } from './wallet-helpers.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireSuperAdmin(req, res);
    if (!ctx) return;
    const { user } = ctx;

    if (req.method === 'GET') {
      const { status } = req.query;
      let query = supabase.from('withdrawals').select('*').order('id', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'PUT') {
      const { id, status, remarks } = req.body || {};
      if (!id || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'id and status (approved|rejected) required' });
      }

      const { data: wd, error: wErr } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (wErr) throw wErr;
      if (!wd) return res.status(404).json({ error: 'Not found' });
      if (wd.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

      const now = new Date().toISOString();

      if (status === 'rejected') {
        // Refund wallet
        try {
          const wallet = await ensureWallet({ id: wd.user_id });
          const newBal = (wallet.balance || 0) + (wd.amount || 0);
          await supabase
            .from('wallets')
            .update({
              balance: newBal,
              lifetime_withdrawn: Math.max(0, (wallet.lifetime_withdrawn || 0) - (wd.amount || 0)),
              updated_at: now,
            })
            .eq('user_id', wd.user_id);
          await supabase.from('wallet_transactions').insert({
            user_id: wd.user_id,
            type: 'refund',
            amount: wd.amount,
            balance_after: newBal,
            description: `Withdrawal #${id} rejected — refunded`,
            meta: { withdrawal_id: id, remarks },
            created_at: now,
          });
        } catch (e) {
          console.error('refund failed', e);
        }
      }

      const { data, error } = await supabase
        .from('withdrawals')
        .update({
          status,
          remarks: remarks || '',
          processed_at: now,
          processed_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Notify user
      try {
        await supabase.from('notifications').insert({
          user_id: wd.user_id,
          title: status === 'approved' ? 'Withdrawal approved' : 'Withdrawal rejected',
          body:
            status === 'approved'
              ? `Your withdrawal of ₹${wd.amount} was approved.`
              : `Your withdrawal request was rejected. ${remarks ? 'Reason: ' + remarks : ''}`,
          description:
            status === 'approved'
              ? `Your withdrawal of ₹${wd.amount} was approved.`
              : `Your withdrawal request was rejected. ${remarks ? 'Reason: ' + remarks : ''}`,
          type: 'wallet',
          read: false,
          created_at: now,
        });
      } catch {
        /* notifications table shape may vary */
      }

      await logActivity(user.id, status === 'approved' ? 'Approved Withdrawal' : 'Rejected Withdrawal', 'withdrawal', id, {
        remarks,
      });
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-withdrawals error', err);
    res.status(500).json({ error: err.message });
  }
}
