import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireSuperAdmin, logActivity } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireSuperAdmin(req, res);
    if (!ctx) return;

    // --- GET: Fetch Sent Notifications List (with grouping for broadcasts) ---
    if (req.method === 'GET') {
      const { data: rows, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      // Group identical broadcast messages created at the same time
      const groupedMap = new Map();
      const resultList = [];

      for (const row of rows || []) {
        const textKey = `${(row.title || '').trim()}|||${(row.body || row.description || '').trim()}`;
        const timeKey = row.created_at ? row.created_at.slice(0, 16) : ''; // group by minute
        const groupKey = `${textKey}|||${timeKey}`;

        if (groupedMap.has(groupKey)) {
          const item = groupedMap.get(groupKey);
          item.ids.push(row.id);
          item.recipient_count += 1;
          if (row.user_id) item.user_ids.push(row.user_id);
        } else {
          const item = {
            id: row.id,
            ids: [row.id],
            title: row.title || 'Untitled Notification',
            body: row.body || row.description || '',
            description: row.description || row.body || '',
            type: row.type || 'info',
            created_by: row.created_by || 'Super Admin',
            created_at: row.created_at,
            updated_at: row.updated_at,
            user_id: row.user_id,
            user_ids: row.user_id ? [row.user_id] : [],
            recipient_count: 1,
            is_broadcast: !row.user_id || false,
          };
          groupedMap.set(groupKey, item);
          resultList.push(item);
        }
      }

      // Mark items with > 1 recipient as broadcast
      resultList.forEach((item) => {
        if (item.recipient_count > 1 || !item.user_id) {
          item.is_broadcast = true;
        }
      });

      return res.status(200).json(resultList);
    }

    // --- POST: Broadcast New Notification ---
    if (req.method === 'POST') {
      const { user_ids, title, body, audience } = req.body || {};
      if (!title || !body) return res.status(400).json({ error: 'Title and message body are required' });

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
      let rows = [];

      if (targets && targets.length > 0) {
        rows = targets.map((uid) => ({
          user_id: uid,
          title: title.trim(),
          body: body.trim(),
          description: body.trim(),
          type: 'info',
          color: '#0077DF',
          read: false,
          created_by: ctx.user.email || 'admin@gmail.com',
          created_at: now,
          updated_at: now,
        }));
      } else {
        // Global / Public Announcement
        rows = [
          {
            user_id: null,
            title: title.trim(),
            body: body.trim(),
            description: body.trim(),
            type: 'info',
            color: '#0077DF',
            read: false,
            created_by: ctx.user.email || 'admin@gmail.com',
            created_at: now,
            updated_at: now,
          },
        ];
      }

      if (rows.length) {
        const { error } = await supabase.from('notifications').insert(rows);
        if (error) throw error;
      }

      await logActivity(ctx.user.id, 'Sent Notification', 'notification', null, {
        count: rows.length,
        title: title.trim(),
      });

      return res.status(201).json({ ok: true, sent: rows.length });
    }

    // --- PUT: Edit Sent Notification(s) ---
    if (req.method === 'PUT') {
      const { id, ids, title, body, type } = req.body || {};
      if (!title && !body) {
        return res.status(400).json({ error: 'Title or message body required for edit' });
      }

      const targetIds = Array.isArray(ids) && ids.length ? ids : id ? [id] : [];
      if (!targetIds.length) {
        return res.status(400).json({ error: 'Notification id or ids are required' });
      }

      const now = new Date().toISOString();
      const updateData = {
        updated_at: now,
      };
      if (title !== undefined) updateData.title = title.trim();
      if (body !== undefined) {
        updateData.body = body.trim();
        updateData.description = body.trim();
      }
      if (type !== undefined) updateData.type = type;

      const { data, error } = await supabase
        .from('notifications')
        .update(updateData)
        .in('id', targetIds)
        .select();

      if (error) throw error;

      await logActivity(ctx.user.id, 'Updated Notification', 'notification', targetIds[0], {
        updated_count: targetIds.length,
        new_title: title,
      });

      return res.status(200).json({
        ok: true,
        updated: targetIds.length,
        data,
      });
    }

    // --- DELETE: Delete Sent Notification(s) ---
    if (req.method === 'DELETE') {
      const body = req.body || {};
      const query = req.query || {};
      const id = body.id || query.id;
      const ids = body.ids || (query.ids ? String(query.ids).split(',') : null);

      const targetIds = Array.isArray(ids) && ids.length ? ids : id ? [id] : [];
      if (!targetIds.length) {
        return res.status(400).json({ error: 'Notification id or ids are required' });
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', targetIds);

      if (error) throw error;

      await logActivity(ctx.user.id, 'Deleted Notification', 'notification', targetIds[0], {
        deleted_count: targetIds.length,
      });

      return res.status(200).json({
        ok: true,
        deleted: targetIds.length,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-notify error', err);
    res.status(500).json({ error: err.message });
  }
}
