import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireSuperAdmin, logActivity } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireSuperAdmin(req, res);
    if (!ctx) return;

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { user_ids, title, body, audience } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });

    let targets = user_ids;
    if (!targets || !targets.length) {
      if (audience === 'staff') {
        const { data: staff } = await supabase
          .from('staff_profiles')
          .select('user_id')
          .eq('is_active', true)
          .eq('role', 'sub_admin');
        targets = [...new Set((staff || []).map((s) => s.user_id).filter(Boolean))];
      } else if (audience === 'all') {
        const [{ data: students }, { data: staff }] = await Promise.all([
          supabase.from('student_counselling').select('user_id').not('user_id', 'is', null),
          supabase.from('staff_profiles').select('user_id').eq('is_active', true),
        ]);
        targets = [
          ...new Set([
            ...(students || []).map((s) => s.user_id),
            ...(staff || []).map((s) => s.user_id),
          ].filter(Boolean)),
        ];
      } else {
        // default: students with linked accounts
        const { data: students } = await supabase
          .from('student_counselling')
          .select('user_id')
          .not('user_id', 'is', null);
        targets = [...new Set((students || []).map((s) => s.user_id).filter(Boolean))];
      }
    }

    const now = new Date().toISOString();
    const rows = targets.map((uid) => ({
      user_id: uid,
      title,
      body,
      description: body,
      read: false,
      created_at: now,
    }));

    if (rows.length) {
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) throw error;
    }

    await logActivity(ctx.user.id, 'Sent Notification', 'notification', null, {
      count: rows.length,
      title,
    });

    return res.status(201).json({ ok: true, sent: rows.length });
  } catch (err) {
    console.error('admin-notify error', err);
    res.status(500).json({ error: err.message });
  }
}
