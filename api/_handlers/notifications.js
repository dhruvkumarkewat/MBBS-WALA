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
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(80);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'PUT') {
      const { id, read, mark_all, mark_chat } = req.body || {};
      if (mark_chat) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('type', 'chat')
          .eq('read', false);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (mark_all) {
        // Update user-specific notifications
        const { error: e1 } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
        if (e1) console.warn('mark_all user notifications error:', e1.message);
        return res.status(200).json({ ok: true });
      }
      if (!id) return res.status(400).json({ error: 'id is required' });
      // Use maybeSingle() to handle broadcast notifications (user_id IS NULL) gracefully
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: read !== false })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) {
        // If the notification is a broadcast (user_id IS NULL), the user can't update it directly.
        // Just return success silently — the read state is managed client-side.
        if (error.code === 'PGRST116' || error.message?.includes('coerce')) {
          return res.status(200).json({ ok: true, id });
        }
        throw error;
      }
      return res.status(200).json(data || { ok: true, id });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('notifications API error:', err);
    res.status(500).json({ error: err.message });
  }
}
