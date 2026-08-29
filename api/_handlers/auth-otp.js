import { setCors } from './_auth.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_WIDGET_ID = '366843686369393035303133';
const FROM_EMAIL = 'MBBSWALA <noreply@newmbbs.starchainlabs.com>';

/* ── OTP store (in-memory per invocation, backed by Supabase) ── */

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://hbzzamezfhzsdupdhcin.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    'sb_publishable_5D517PLNdF92v3Q1s6Dp_w_WaZtsrPo';
  return createClient(url, key, { auth: { persistSession: false } });
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('[auth-otp] No RESEND_API_KEY set — email skipped');
    return { ok: true, skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to send email via Resend');
  return data;
}

/* ── Ensure the otp_verifications table exists ── */
async function ensureTable(supabase) {
  // Attempt a simple insert-dry-run to check; Supabase will auto-create nothing,
  // so we use a try/catch and instruct users to create the table manually if missing.
  // The table DDL is printed in logs once.
  const { error } = await supabase
    .from('otp_verifications')
    .select('id')
    .limit(1);
  if (error && error.code === '42P01') {
    console.error(
      '[auth-otp] Table "otp_verifications" does not exist. Run this SQL in Supabase:\n' +
        `CREATE TABLE otp_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  type text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);`
    );
    throw new Error('OTP table missing — please create it in Supabase SQL editor.');
  }
}

/* ──────────────────────────────────────────────
   Email OTP HTML template
   ──────────────────────────────────────────────*/
function otpEmailHtml({ name, otp, type }) {
  const isPhone = type === 'phone';
  const title = isPhone ? 'Verify your phone number' : 'Verify your email address';
  const intro = isPhone
    ? `We received a request to verify the phone number linked to your MBBSWALA account.`
    : `Welcome to MBBSWALA! Please verify your email address to continue creating your account.`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#161b22;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#f97316,#fb923c);padding:28px 32px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">MBBS<span style="color:#fff9;">WALA</span></div>
            <div style="font-size:12px;color:rgba(255,255,255,0.85);font-weight:600;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Premium Medical Counselling</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <h2 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f0f6fc;">${title}</h2>
            <p style="margin:0 0 28px;font-size:14px;color:rgba(240,246,252,0.7);line-height:1.6;">
              ${name ? `Hi <strong style="color:#f0f6fc;">${name}</strong>, ` : ''}${intro}
            </p>

            <!-- OTP Box -->
            <div style="text-align:center;margin:0 auto 28px;background:#0d1117;border:1px solid rgba(249,115,22,0.3);border-radius:12px;padding:24px 16px;max-width:260px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(240,246,252,0.5);margin-bottom:12px;">Your verification code</div>
              <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#f97316;font-family:'Courier New',monospace;">${otp}</div>
              <div style="font-size:12px;color:rgba(240,246,252,0.4);margin-top:12px;">⏱ Valid for <strong>10 minutes</strong></div>
            </div>

            <p style="margin:0 0 8px;font-size:13px;color:rgba(240,246,252,0.5);line-height:1.6;">
              If you did not request this, you can safely ignore this email. Do not share this code with anyone.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(240,246,252,0.3);">
              © ${new Date().getFullYear()} MBBSWALA · India's Medical Admission Portal<br/>
              <a href="https://mbbswala.in" style="color:#f97316;text-decoration:none;">mbbswala.in</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ──────────────────────────────────────────────
   Welcome Email HTML template
   ──────────────────────────────────────────────*/
function welcomeEmailHtml({ name, email }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;background:#161b22;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#f97316,#fb923c);padding:32px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">🎉</div>
            <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Welcome to MBBSWALA!</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.85);font-weight:600;margin-top:6px;">Your account is ready</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 20px;font-size:15px;color:rgba(240,246,252,0.85);line-height:1.7;">
              Hi <strong style="color:#f0f6fc;">${name}</strong>,<br/><br/>
              Your MBBSWALA student account has been <strong style="color:#22c55e;">successfully created and verified</strong>. 
              You now have access to India's most comprehensive MBBS counselling platform.
            </p>

            <!-- Account Details Box -->
            <div style="background:#0d1117;border:1px solid rgba(249,115,22,0.25);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(249,115,22,0.8);margin-bottom:14px;">Your Account Details</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:rgba(240,246,252,0.5);padding-bottom:10px;width:40%;">Full Name</td>
                  <td style="font-size:13px;color:#f0f6fc;font-weight:700;padding-bottom:10px;">${name}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:rgba(240,246,252,0.5);padding-bottom:10px;">Email</td>
                  <td style="font-size:13px;color:#f0f6fc;font-weight:700;padding-bottom:10px;">${email}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:rgba(240,246,252,0.5);">Password</td>
                  <td style="font-size:13px;color:rgba(240,246,252,0.5);">The password you set during signup</td>
                </tr>
              </table>
            </div>

            <!-- Features -->
            <div style="margin-bottom:28px;">
              <div style="font-size:13px;font-weight:700;color:rgba(240,246,252,0.6);margin-bottom:12px;letter-spacing:0.5px;">WHAT YOU CAN ACCESS NOW:</div>
              ${[
                ['🎯', 'AI College Predictor', 'Get personalized MBBS college predictions based on your NEET rank'],
                ['📊', 'Seat Matrix & Cutoffs', 'Explore verified cutoffs from MCC, state quota & private colleges'],
                ['🤖', 'AI Chat Assistant', 'Ask anything about MBBS admissions, fees, and counselling'],
                ['🏆', 'Competition Map', 'See how you rank against students in your state'],
              ].map(([icon, title, desc]) => `
              <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
                <div style="font-size:20px;width:28px;flex-shrink:0;">${icon}</div>
                <div>
                  <div style="font-size:13px;font-weight:700;color:#f0f6fc;">${title}</div>
                  <div style="font-size:12px;color:rgba(240,246,252,0.5);margin-top:2px;">${desc}</div>
                </div>
              </div>`).join('')}
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:8px;">
              <a href="https://mbbs-waala.dhruvkamar2005.workers.dev/dashboard" 
                 style="display:inline-block;background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 36px;border-radius:100px;letter-spacing:-0.2px;">
                Open My Dashboard →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:rgba(240,246,252,0.3);">Need help? Call us at <a href="tel:+917880119983" style="color:#f97316;text-decoration:none;">+91 78801 19983</a></p>
            <p style="margin:0;font-size:11px;color:rgba(240,246,252,0.2);">© ${new Date().getFullYear()} MBBSWALA · <a href="https://mbbswala.in" style="color:rgba(240,246,252,0.3);text-decoration:none;">mbbswala.in</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ──────────────────────────────────────────────
   Main handler
   ──────────────────────────────────────────────*/
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, name, phone, otp, password, referralCode, msg91Token } = req.body || {};

  if (!action) return res.status(400).json({ error: 'action is required' });

  try {
    const supabase = await getSupabase();
    await ensureTable(supabase);

    /* ── 1. Send email OTP ── */
    if (action === 'send_email_otp') {
      if (!email) return res.status(400).json({ error: 'email is required' });

      // Check if email already exists in Supabase auth
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email.trim().toLowerCase())
        .limit(1);
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: `An account with "${email}" already exists. Please log in instead.` });
      }

      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Delete old OTPs for this email/type
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('email', email.trim().toLowerCase())
        .eq('type', 'email');

      const { error: insertErr } = await supabase.from('otp_verifications').insert({
        email: email.trim().toLowerCase(),
        type: 'email',
        otp: otpCode,
        expires_at: expiresAt,
        verified: false,
      });
      if (insertErr) throw insertErr;

      await sendEmail({
        to: email.trim(),
        subject: `${otpCode} — Your MBBSWALA Email Verification Code`,
        html: otpEmailHtml({ name: name || '', otp: otpCode, type: 'email' }),
      });

      return res.status(200).json({ ok: true, message: 'Email OTP sent successfully' });
    }

    /* ── 2. Verify email OTP ── */
    if (action === 'verify_email_otp') {
      if (!email || !otp) return res.status(400).json({ error: 'email and otp are required' });

      const { data: row, error: fetchErr } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('type', 'email')
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!row) return res.status(400).json({ error: 'OTP not found. Please request a new code.' });
      if (new Date(row.expires_at) < new Date()) {
        return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
      }
      if (row.otp !== otp.trim()) {
        return res.status(400).json({ error: 'Incorrect OTP. Please check your email and try again.' });
      }

      await supabase
        .from('otp_verifications')
        .update({ verified: true })
        .eq('id', row.id);

      return res.status(200).json({ ok: true, message: 'Email verified successfully' });
    }

    /* ── 3. Verify MSG91 phone token (real SMS OTP via MSG91 widget) ── */
    if (action === 'verify_msg91_token') {
      if (!email || !msg91Token) {
        return res.status(400).json({ error: 'email and msg91Token are required' });
      }

      // Ensure email was verified first
      const { data: emailRow } = await supabase
        .from('otp_verifications')
        .select('verified')
        .eq('email', email.trim().toLowerCase())
        .eq('type', 'email')
        .eq('verified', true)
        .limit(1)
        .maybeSingle();

      if (!emailRow) {
        return res.status(400).json({ error: 'Please verify your email before verifying your phone.' });
      }

      if (!MSG91_AUTH_KEY) {
        // If no MSG91 key configured, allow bypass in dev mode (log warning)
        console.warn('[auth-otp] MSG91_AUTH_KEY not set — skipping phone token verification (dev mode)');
        // Mark phone as verified in DB
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await supabase.from('otp_verifications').delete().eq('email', email.trim().toLowerCase()).eq('type', 'phone');
        await supabase.from('otp_verifications').insert({
          email: email.trim().toLowerCase(), type: 'phone', otp: 'MSG91_BYPASS',
          expires_at: expiresAt, verified: true,
        });
        return res.status(200).json({ ok: true, message: 'Phone verified (dev mode)' });
      }

      // Verify the MSG91 JWT token server-side
      const msg91Res = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authkey: MSG91_AUTH_KEY,
          'access-token': msg91Token,
        }),
      });
      const msg91Data = await msg91Res.json();

      if (!msg91Res.ok || msg91Data?.type !== 'success') {
        return res.status(400).json({
          error: msg91Data?.message || 'Phone verification failed. Please try again.',
        });
      }

      // Mark phone as verified in Supabase
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await supabase.from('otp_verifications').delete().eq('email', email.trim().toLowerCase()).eq('type', 'phone');
      await supabase.from('otp_verifications').insert({
        email: email.trim().toLowerCase(),
        type: 'phone',
        otp: 'MSG91_VERIFIED',
        expires_at: expiresAt,
        verified: true,
      });

      return res.status(200).json({ ok: true, message: 'Phone verified successfully via MSG91' });
    }

    /* ── 5. Complete signup — create account + send welcome email ── */
    if (action === 'complete_signup') {
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'email, password, and name are required' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Verify both OTPs are done
      const { data: emailVerified } = await supabase
        .from('otp_verifications')
        .select('id')
        .eq('email', cleanEmail)
        .eq('type', 'email')
        .eq('verified', true)
        .limit(1)
        .maybeSingle();

      const { data: phoneVerified } = await supabase
        .from('otp_verifications')
        .select('id')
        .eq('email', cleanEmail)
        .eq('type', 'phone')
        .eq('verified', true)
        .limit(1)
        .maybeSingle();

      if (!emailVerified) {
        return res.status(400).json({ error: 'Email not verified. Please complete email verification first.' });
      }
      if (!phoneVerified) {
        return res.status(400).json({ error: 'Phone not verified. Please complete phone verification first.' });
      }

      // Create Supabase account
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbzzamezfhzsdupdhcin.supabase.co';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });

      const { data: authData, error: signUpErr } = await adminClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone?.trim() || '',
            referred_by_code: referralCode?.trim() || undefined,
            email_verified: true,
            phone_verified: true,
          },
        },
      });

      if (signUpErr) {
        const errLower = signUpErr.message?.toLowerCase() || '';
        if (errLower.includes('already registered') || errLower.includes('already exists') || signUpErr.status === 422) {
          return res.status(409).json({ error: `An account with "${cleanEmail}" already exists. Please log in.` });
        }
        throw signUpErr;
      }

      // Update profile table if it was auto-created
      if (authData?.user?.id) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: cleanEmail,
          full_name: name.trim(),
          phone: phone?.trim() || '',
          referred_by_code: referralCode?.trim() || null,
        }, { onConflict: 'id' }).select();
      }

      // Send Welcome Email
      try {
        await sendEmail({
          to: email.trim(),
          subject: '🎉 Welcome to MBBSWALA — Your Account is Ready!',
          html: welcomeEmailHtml({ name: name.trim(), email: cleanEmail }),
        });
      } catch (emailErr) {
        console.warn('[auth-otp] Welcome email failed (non-fatal):', emailErr.message);
      }

      // Clean up OTP records
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('email', cleanEmail);

      return res.status(200).json({
        ok: true,
        message: 'Account created successfully! Welcome email sent.',
        userId: authData?.user?.id,
      });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[auth-otp] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
