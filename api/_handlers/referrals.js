import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';
import { ensureWallet, creditWallet } from './wallet-helpers.js';

const REFERRER_REWARD = 500;
const REFEREE_DISCOUNT = 500;

async function tryAwardBadges(userId) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const { count: refCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('status', 'completed');

  const { data: badges } = await supabase.from('badges').select('*');
  const { data: owned } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);
  const ownedSet = new Set((owned || []).map((o) => o.badge_id));

  for (const b of badges || []) {
    if (ownedSet.has(b.id)) continue;
    let ok = false;
    if (b.requirement_type === 'referrals' && (refCount || 0) >= b.requirement_value) ok = true;
    if (b.requirement_type === 'earnings' && (wallet?.lifetime_earned || 0) >= b.requirement_value)
      ok = true;
    if (ok) {
      await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: b.id,
        earned_at: new Date().toISOString(),
      });
    }
  }
}

async function bumpChallenges(userId) {
  const { data: active } = await supabase
    .from('challenges')
    .select('*')
    .eq('active', true)
    .eq('challenge_type', 'referrals');

  for (const ch of active || []) {
    let { data: uc } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_id', ch.id)
      .maybeSingle();

    if (!uc) {
      const ins = await supabase
        .from('user_challenges')
        .insert({
          user_id: userId,
          challenge_id: ch.id,
          progress: 0,
          status: 'active',
        })
        .select()
        .single();
      uc = ins.data;
    }
    if (!uc || uc.status === 'completed') continue;

    const progress = (uc.progress || 0) + 1;
    const done = progress >= ch.target_count;
    await supabase
      .from('user_challenges')
      .update({
        progress,
        status: done ? 'completed' : 'active',
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq('id', uc.id);

    if (done && ch.reward_amount > 0) {
      await ensureWallet({ id: userId });
      await creditWallet(
        userId,
        ch.reward_amount,
        'challenge_reward',
        `Challenge completed: ${ch.title}`,
        { challenge_id: ch.id }
      );
    }
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // Public validate code (for signup)
    if (req.method === 'GET' && req.query?.code && req.query?.validate === '1') {
      const code = String(req.query.code).trim().toUpperCase();
      const { data } = await supabase
        .from('wallets')
        .select('referral_code, user_id')
        .eq('referral_code', code)
        .maybeSingle();
      return res.status(200).json({
        valid: !!data,
        code,
        discount: data ? REFEREE_DISCOUNT : 0,
      });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const wallet = await ensureWallet(user);
      const { data: list, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('id', { ascending: false });
      if (error) throw error;

      const completed = (list || []).filter((r) => r.status === 'completed').length;
      const pending = (list || []).filter((r) => r.status === 'pending').length;

      return res.status(200).json({
        referral_code: wallet.referral_code,
        share_url: `https://mbbswala.in/login?ref=${wallet.referral_code}`,
        rewards: { referrer: REFERRER_REWARD, referee: REFEREE_DISCOUNT },
        stats: {
          total: (list || []).length,
          completed,
          pending,
          earned: completed * REFERRER_REWARD,
        },
        referrals: list || [],
      });
    }

    // Apply / complete a referral when new user joins with a code
    if (req.method === 'POST') {
      const { action, code, referee_name } = req.body || {};

      if (action === 'apply') {
        const wallet = await ensureWallet(user);
        const refCode = String(code || '').trim().toUpperCase();
        if (!refCode) return res.status(400).json({ error: 'Referral code required' });

        // already used a code?
        const { data: existingAsReferee } = await supabase
          .from('referrals')
          .select('id')
          .eq('referee_id', user.id)
          .maybeSingle();
        if (existingAsReferee) {
          return res.status(400).json({ error: 'You already applied a referral code' });
        }

        const { data: referrerWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('referral_code', refCode)
          .maybeSingle();
        if (!referrerWallet) return res.status(404).json({ error: 'Invalid referral code' });
        if (referrerWallet.user_id === user.id) {
          return res.status(400).json({ error: 'You cannot use your own code' });
        }

        // Create completed referral + rewards
        const now = new Date().toISOString();
        const { data: refRow, error: rErr } = await supabase
          .from('referrals')
          .insert({
            referrer_id: referrerWallet.user_id,
            referee_id: user.id,
            referee_email: user.email || '',
            referee_name:
              referee_name ||
              user.user_metadata?.full_name ||
              user.email?.split('@')[0] ||
              'Friend',
            referral_code: refCode,
            status: 'completed',
            referrer_reward: REFERRER_REWARD,
            referee_discount: REFEREE_DISCOUNT,
            created_at: now,
            completed_at: now,
          })
          .select()
          .single();
        if (rErr) throw rErr;

        // Credit referrer wallet ₹500
        await ensureWallet({ id: referrerWallet.user_id });
        await creditWallet(
          referrerWallet.user_id,
          REFERRER_REWARD,
          'referral_reward',
          `Referral reward — ${user.email || 'new user'} joined`,
          { referral_id: refRow.id, referee_id: user.id }
        );

        // Issue ₹500 coupon for referee
        const couponCode = `SAVE${REFEREE_DISCOUNT}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const exp = new Date();
        exp.setMonth(exp.getMonth() + 6);
        await supabase.from('coupons').insert({
          user_id: user.id,
          code: couponCode,
          title: 'Referral Welcome Discount',
          description: `₹${REFEREE_DISCOUNT} off counselling package — thanks to referral ${refCode}`,
          discount_amount: REFEREE_DISCOUNT,
          status: 'active',
          source: 'referral',
          expires_at: exp.toISOString(),
          created_at: now,
        });

        // Also log a zero-amount txn note for referee
        await ensureWallet(user);
        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          type: 'coupon_issued',
          amount: 0,
          balance_after: wallet.balance || 0,
          description: `Received ₹${REFEREE_DISCOUNT} counselling coupon ${couponCode}`,
          meta: { coupon_code: couponCode, referral_code: refCode },
          created_at: now,
        });

        await tryAwardBadges(referrerWallet.user_id);
        await bumpChallenges(referrerWallet.user_id);

        return res.status(201).json({
          ok: true,
          message: `Code applied! You got ₹${REFEREE_DISCOUNT} counselling discount. Your friend earned ₹${REFERRER_REWARD}.`,
          coupon_code: couponCode,
          discount: REFEREE_DISCOUNT,
          referral: refRow,
        });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('referrals API error:', err);
    res.status(500).json({ error: err.message });
  }
}
