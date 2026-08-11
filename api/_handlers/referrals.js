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
    // Public validate code (for signup / checkout)
    if (req.method === 'GET' && req.query?.code && req.query?.validate === '1') {
      const code = String(req.query.code).trim().toUpperCase();
      const { data } = await supabase
        .from('wallets')
        .select('referral_code, user_id')
        .eq('referral_code', code)
        .maybeSingle();
        
      if (!data) {
        return res.status(200).json({ valid: false, message: 'Invalid referral code.' });
      }
      
      // If we have the logged in user, do extra checks
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
          if (currentUser) {
            if (data.user_id === currentUser.id) {
              return res.status(200).json({ valid: false, message: 'You cannot use your own referral code.' });
            }
            const { data: existingAsReferee } = await supabase
              .from('referrals')
              .select('id')
              .eq('referee_id', currentUser.id)
              .maybeSingle();
            if (existingAsReferee) {
              return res.status(200).json({ valid: false, message: 'You have already used a referral code.' });
            }
          }
        } catch (e) {
          // ignore auth errors for public validate
        }
      }

      return res.status(200).json({
        valid: true,
        code,
        discount: REFEREE_DISCOUNT,
      });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      let wallet = null;
      try {
        wallet = await ensureWallet(user);
      } catch (wErr) {
        console.warn('ensureWallet fallback:', wErr.message);
      }
      const refCode = wallet?.referral_code || (user.id ? 'MBBS' + user.id.slice(0, 5).toUpperCase() : 'MBBS500');

      let list = [];
      try {
        const { data: refList, error } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('id', { ascending: false });
        if (!error && refList) list = refList;
      } catch (rErr) {
        console.warn('referrals query error:', rErr.message);
      }

      const completed = (list || []).filter((r) => r.status === 'completed').length;
      const pending = (list || []).filter((r) => r.status === 'pending').length;

      return res.status(200).json({
        referral_code: refCode,
        share_url: `https://mbbswaala.io/login?ref=${refCode}`,
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

    if (req.method === 'POST') {
      const { action, code } = req.body || {};
      
      if (action === 'apply') {
        if (!code) return res.status(400).json({ error: 'Code is required' });
        
        const cleanCode = String(code).trim().toUpperCase();
        
        // Find referrer
        const { data: referrerWallet } = await supabase
          .from('wallets')
          .select('user_id')
          .eq('referral_code', cleanCode)
          .maybeSingle();
          
        if (!referrerWallet) {
          return res.status(400).json({ error: 'Invalid referral code' });
        }
        
        if (referrerWallet.user_id === user.id) {
          return res.status(400).json({ error: 'Cannot use your own code' });
        }
        
        // Check if already referred
        const { data: existingRef } = await supabase
          .from('referrals')
          .select('id')
          .eq('referee_id', user.id)
          .maybeSingle();
          
        if (existingRef) {
          return res.status(400).json({ error: 'Already referred' });
        }
        
        // Insert referral
        const { error: insErr } = await supabase.from('referrals').insert({
          referrer_id: referrerWallet.user_id,
          referee_id: user.id,
          referee_email: user.email,
          referral_code: cleanCode,
          status: 'pending',
          referrer_reward: REFERRER_REWARD,
          referee_discount: REFEREE_DISCOUNT
        });
        
        if (insErr) {
          console.error('Failed to insert referral:', insErr);
          return res.status(500).json({ error: 'Failed to apply code' });
        }
        
        return res.status(200).json({ success: true, message: 'Referral applied' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('referrals API error:', err);
    if (req.method === 'GET') {
      return res.status(200).json({
        referral_code: 'MBBS500',
        share_url: 'https://mbbswaala.io/login?ref=MBBS500',
        rewards: { referrer: REFERRER_REWARD, referee: REFEREE_DISCOUNT },
        stats: { total: 0, completed: 0, pending: 0, earned: 0 },
        referrals: [],
      });
    }
    res.status(500).json({ error: err.message || 'Referral service error' });
  }
}
