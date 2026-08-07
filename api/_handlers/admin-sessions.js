import { setCors } from './_auth.js';
import { requireStaff } from './_admin.js';
import { getStaffSessions } from './_sessions.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireStaff(req, res);
    if (!ctx) return;
    const { user, staff } = ctx;
    const isSuper = staff.role === 'super_admin';

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const sessions = await getStaffSessions(user.id, isSuper);
    return res.status(200).json(sessions);
  } catch (err) {
    console.error('admin-sessions error', err);
    return res.status(200).json([]);
  }
}
