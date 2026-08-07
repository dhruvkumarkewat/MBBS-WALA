import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';
import { getStaffProfile, logActivity, touchPresence } from './_admin.js';
import { recordLogin, recordHeartbeat, recordLogout } from './_sessions.js';

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
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';

      if (action === 'login') {
        const sess = recordLogin(staff, { ip, user_agent: userAgent });

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
        const sess = recordLogout(user.id);
        await logActivity(user.id, 'Logged Out', 'session', sess?.id);
        return res.status(200).json({ ok: true, session: sess });
      }

      if (action === 'heartbeat') {
        recordHeartbeat(user.id);
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
