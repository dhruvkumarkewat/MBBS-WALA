import crypto from 'crypto';
import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';
import { ensureWallet, creditWallet, makeCode } from './wallet-helpers.js';

const REFERRAL_REWARD_AMOUNT = 500;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const action = req.query?.action || (req.body && req.body.action) || '';

    // ── 1. GET: Fetch payment history and active subscription ────────────────
    if (req.method === 'GET') {
      const { data: paymentsList } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });

      const { data: subList } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, subscription_status, subscription_plan, payment_status, premium_start_date, premium_end_date')
        .eq('id', user.id)
        .maybeSingle();

      return res.status(200).json({
        profile: profile || {},
        is_premium: Boolean(profile?.is_premium),
        subscription: subList?.[0] || null,
        subscriptions: subList || [],
        payments: paymentsList || [],
      });
    }

    // ── 2. POST action=create-order ──────────────────────────────────────────
    if (req.method === 'POST' && (action === 'create-order' || !action)) {
      const { plan_slug = 'premium', plan_name = 'Premium Plan', amount = 4999, referral_code } = req.body || {};
      
      let finalAmount = Number(amount);
      let appliedReferralCode = null;
      let referrerId = null;

      // Validate referral code if provided
      if (referral_code) {
        const refCode = String(referral_code).trim().toUpperCase();
        const { data: referrerWallet } = await supabase
          .from('wallets')
          .select('user_id')
          .eq('referral_code', refCode)
          .maybeSingle();

        if (referrerWallet && referrerWallet.user_id !== user.id) {
          // Check if already used a code?
          const { data: existingAsReferee } = await supabase
            .from('referrals')
            .select('id')
            .eq('referee_id', user.id)
            .maybeSingle();
            
          if (!existingAsReferee) {
            finalAmount = Math.max(0, finalAmount - 500);
            appliedReferralCode = refCode;
            referrerId = referrerWallet.user_id;
          }
        }
      }

      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TGKNxC2HkMEptZ';
      const keySecret = process.env.RAZORPAY_KEY_SECRET || 'VJk0E7jhcJFwuOFz303O5aGJ';
      const receipt = `rcpt_${user.id.slice(0, 6)}_${Date.now()}`;
      
      let orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      
      // Call Razorpay API to create a real order
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({
            amount: finalAmount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: receipt
          })
        });
        
        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          orderId = rzpData.id;
        } else {
          const err = await rzpRes.json();
          console.error('Razorpay order creation failed:', err);
          return res.status(500).json({ error: 'Failed to initialize payment gateway' });
        }
      } catch (e) {
        console.error('Razorpay fetch error:', e);
        return res.status(500).json({ error: 'Payment gateway communication error' });
      }

      // Save initial payment record
      await supabase.from('payments').insert({
        user_id: user.id,
        order_id: orderId,
        amount: finalAmount,
        currency: 'INR',
        status: 'created',
        gateway: 'razorpay',
        plan_slug,
        receipt,
        meta: { 
          plan_name, 
          referral_code: appliedReferralCode,
          referrer_id: referrerId
        },
        created_at: new Date().toISOString(),
      });

      return res.status(200).json({
        ok: true,
        orderId,
        keyId,
        amount: finalAmount * 100, // Send paise to frontend
        original_amount: Number(amount) * 100,
        currency: 'INR',
        plan_slug,
        plan_name,
        isLiveGateway: true, // Always true now since we create real orders
      });
    }

    // ── 3. POST action=verify (Activate Premium) ─────────────────────────────
    if (req.method === 'POST' && action === 'verify') {
      const {
        order_id,
        payment_id = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        signature,
        plan_slug = 'premium',
        plan_name = 'Premium Plan',
        amount = 4999,
      } = req.body || {};

      // If Razorpay live secret is present, verify HMAC signature
      const secret = process.env.RAZORPAY_KEY_SECRET || 'VJk0E7jhcJFwuOFz303O5aGJ';
      if (secret && signature && order_id) {
        const expected = crypto
          .createHmac('sha256', secret)
          .update(`${order_id}|${payment_id}`)
          .digest('hex');
        if (expected !== signature) {
          return res.status(400).json({ error: 'Invalid payment signature' });
        }
      }

      const now = new Date();
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      // 1. Activate Premium in User Profile
      const { data: updatedProfile, error: profErr } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          subscription_status: 'active',
          subscription_plan: plan_name,
          payment_status: 'Paid',
          premium_start_date: now.toISOString(),
          premium_end_date: oneYearLater.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (profErr) {
        console.error('Failed to update profile to premium:', profErr);
      }

      // 2. Record in Subscriptions Table
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_slug,
        plan_name,
        amount: Number(amount),
        currency: 'INR',
        status: 'active',
        gateway: 'razorpay',
        payment_id,
        order_id,
        start_date: now.toISOString(),
        end_date: oneYearLater.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      // 3. Extract referral details before updating Payments Table
      let appliedReferralCode = null;
      let referrerId = null;
      if (order_id) {
        const { data: paymentRecord } = await supabase
          .from('payments')
          .select('meta')
          .eq('order_id', order_id)
          .maybeSingle();
        
        appliedReferralCode = paymentRecord?.meta?.referral_code;
        referrerId = paymentRecord?.meta?.referrer_id;
        
        await supabase
          .from('payments')
          .update({
            payment_id,
            signature,
            status: 'captured',
            amount: Number(amount),
          })
          .eq('order_id', order_id);
      } else {
        await supabase.from('payments').insert({
          user_id: user.id,
          order_id,
          payment_id,
          amount: Number(amount),
          currency: 'INR',
          status: 'captured',
          gateway: 'razorpay',
          plan_slug,
          signature,
          created_at: now.toISOString(),
        });
      }

      // 4. Process Referral Reward if applicable
      if (appliedReferralCode && referrerId) {
        const { data: existingAsReferee } = await supabase
          .from('referrals')
          .select('id')
          .eq('referee_id', user.id)
          .maybeSingle();
          
        if (!existingAsReferee) {
          // Record successful referral
          const { data: refRow, error: rErr } = await supabase
            .from('referrals')
            .insert({
              referrer_id: referrerId,
              referee_id: user.id,
              referee_email: user.email || '',
              referee_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Friend',
              referral_code: appliedReferralCode,
              status: 'completed',
              referrer_reward: REFERRAL_REWARD_AMOUNT,
              referee_discount: 500, // Applied at checkout
              created_at: now.toISOString(),
              completed_at: now.toISOString(),
            })
            .select()
            .single();

          if (!rErr && refRow) {
            // Credit referrer wallet ₹500
            await ensureWallet({ id: referrerId });
            await creditWallet(
              referrerId,
              REFERRAL_REWARD_AMOUNT,
              'referral_reward',
              `Referral reward — ${user.email || 'new user'} purchased a plan`,
              { referral_id: refRow.id, referee_id: user.id }
            );
          }
        }
      }

      // 4. Ensure permanent unique Referral Code for this new Premium User
      let userWallet = await ensureWallet(user);
      if (!userWallet.referral_code || userWallet.referral_code.startsWith('MBWUSER')) {
        const prefix = 'MED' + Math.random().toString(36).slice(2, 5).toUpperCase();
        const code = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
        await supabase.from('wallets').update({ referral_code: code }).eq('user_id', user.id);
        await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id);
        userWallet.referral_code = code;
      }

      // 5. Automatic Referral Reward Crediting for Referrer
      try {
        const { data: referralRecord } = await supabase
          .from('referrals')
          .select('*')
          .eq('referee_id', user.id)
          .maybeSingle();

        if (referralRecord && referralRecord.referrer_id && referralRecord.status !== 'completed') {
          // Mark referral completed
          await supabase
            .from('referrals')
            .update({
              status: 'completed',
              completed_at: now.toISOString(),
            })
            .eq('id', referralRecord.id);

          // Credit referrer's wallet ₹500
          await ensureWallet({ id: referralRecord.referrer_id });
          await creditWallet(
            referralRecord.referrer_id,
            REFERRAL_REWARD_AMOUNT,
            'referral_reward',
            `Referral reward: ${user.email || 'Friend'} purchased ${plan_name}`,
            { referral_id: referralRecord.id, referee_id: user.id, plan: plan_slug }
          );

          // Notify Referrer
          await supabase.from('notifications').insert({
            user_id: referralRecord.referrer_id,
            title: '🎉 Referral Reward Received (₹500)',
            body: `Your referee just upgraded to ${plan_name}! ₹500 has been credited directly to your wallet.`,
            type: 'reward',
            read: false,
            created_at: now.toISOString(),
          });
        }
      } catch (refErr) {
        console.warn('Referral payout processing warning:', refErr.message);
      }

      // 6. Welcome Notification for the Buyer
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '🌟 Welcome to MBBSWala Premium!',
        body: `Your ${plan_name} is now active. All 1000+ predictions, AI counsellor, round-wise cutoffs, and seat matrices are unlocked.`,
        type: 'subscription',
        read: false,
        created_at: now.toISOString(),
      });

      return res.status(200).json({
        ok: true,
        message: 'Payment verified and Premium activated successfully!',
        profile: updatedProfile,
        is_premium: true,
        referral_code: userWallet.referral_code,
      });
    }

    // ── 4. POST action=fail (Payment Failed) ────────────────────────────────
    if (req.method === 'POST' && action === 'fail') {
      const { order_id, error_description } = req.body || {};
      
      if (!order_id) {
        return res.status(400).json({ error: 'Order ID required' });
      }

      try {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            meta: { error: error_description }
          })
          .eq('order_id', order_id);

        return res.status(200).json({ ok: true, message: 'Payment failure recorded' });
      } catch (err) {
        console.error('Fail record error:', err);
        return res.status(500).json({ error: 'Internal error recording failure' });
      }
    }

    res.status(400).json({ error: 'Invalid action specified' });
  } catch (err) {
    console.error('Payment API error:', err);
    res.status(500).json({ error: err.message });
  }
}
