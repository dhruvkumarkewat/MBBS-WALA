import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';
import { getStaffProfile, logActivity, touchPresence } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const staff = await getStaffProfile(user.id);
      if (!staff || !staff.is_active) {
        return res.status(200).json({ isStaff: false, role: 'user' });
      }
      return res.status(200).json({
        isStaff: true,
        role: staff.role,
        staff,
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};
      const staff = await getStaffProfile(user.id);
      if (!staff || !staff.is_active) {
        return res.status(403).json({ error: 'Not a staff account' });
      }

      const now = new Date().toISOString();

      if (action === 'login') {
        let sess = null;
        try {
          const { data } = await supabase
            .from('login_history')
            .insert({
              user_id: user.id,
              login_at: now,
              ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
              user_agent: req.headers['user-agent'] || '',
            })
            .select()
            .single();
          sess = data;
        } catch {
          // ignore if table not present
        }

        try {
          await supabase
            .from('staff_profiles')
            .update({
              total_sessions: (staff.total_sessions || 0) + 1,
              updated_at: now,
            })
            .eq('user_id', user.id);
        } catch {
          // ignore
        }

        await logActivity(user.id, 'Logged In', 'session', sess?.id);
        return res.status(200).json({ ok: true, session: sess, staff: await getStaffProfile(user.id) });
      }

      if (action === 'logout') {
        let openId = null;
        try {
          const { data: open } = await supabase
            .from('login_history')
            .select('*')
            .eq('user_id', user.id)
            .is('logout_at', null)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (open) {
            openId = open.id;
            const loginAt = new Date(open.login_at).getTime();
            const duration = Math.max(0, Math.round((Date.now() - loginAt) / 1000));
            await supabase
              .from('login_history')
              .update({ logout_at: now, duration_seconds: duration })
              .eq('id', open.id);
          }
        } catch {
          // ignore
        }

        await logActivity(user.id, 'Logged Out', 'session', openId);
        return res.status(200).json({ ok: true });
      }

      if (action === 'heartbeat') {
        await touchPresence(user.id, 'online');
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-auth error', err);
    if (req.method === 'GET') {
      return res.status(200).json({ isStaff: false, role: 'user' });
    }
    res.status(500).json({ error: err.message || 'Admin authentication error' });
  }
}
