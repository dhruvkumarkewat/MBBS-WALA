import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { coupon_id, action } = req.body || {};
      if (action === 'redeem' && coupon_id) {
        const { data, error } = await supabase
          .from('coupons')
          .update({ status: 'redeemed' })
          .eq('id', coupon_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .select()
          .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Coupon not found or already used' });
        return res.status(200).json(data);
      }
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('coupons API error:', err);
    res.status(500).json({ error: err.message });
  }
}
