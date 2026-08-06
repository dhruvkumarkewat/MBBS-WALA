import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

async function parseBody(req) {
  let body = req.body;
  // If body is a Buffer or readable stream, read it manually
  if (body === undefined || body === null) {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf-8');
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }
  }
  // If body is a string, parse it
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  return body || {};
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      // No FK embed — fetch saved rows then hydrate colleges manually
      // (avoids "Could not find a relationship between saved_colleges and colleges")
      const { data: rows, error } = await supabase
        .from('saved_colleges')
        .select('id, college_id, user_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const list = rows || [];
      if (!list.length) return res.status(200).json([]);

      const ids = [...new Set(list.map((r) => r.college_id).filter(Boolean))];
      let collegeMap = {};
      if (ids.length) {
        const { data: colleges, error: cErr } = await supabase
          .from('colleges')
          .select('id, name, city, state, country, college_type, course, source')
          .in('id', ids);
        if (cErr) throw cErr;
        collegeMap = Object.fromEntries((colleges || []).map((c) => [c.id, c]));
      }

      const hydrated = list.map((row) => ({
        ...row,
        colleges: collegeMap[row.college_id] || null,
      }));
      return res.status(200).json(hydrated);
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const collegeId = body?.college_id || req.query?.college_id;
      if (!collegeId) return res.status(400).json({ error: 'college_id is required' });

      // Ensure college exists
      const { data: college, error: findErr } = await supabase
        .from('colleges')
        .select('id, name, city, state, country, college_type, course')
        .eq('id', collegeId)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!college) return res.status(404).json({ error: 'College not found' });

      const { data: existing } = await supabase
        .from('saved_colleges')
        .select('id, college_id, created_at')
        .eq('user_id', user.id)
        .eq('college_id', collegeId)
        .maybeSingle();
      if (existing) {
        return res.status(200).json({ ...existing, colleges: college });
      }

      const { data, error } = await supabase
        .from('saved_colleges')
        .insert({
          user_id: user.id,
          college_id: collegeId,
          created_at: new Date().toISOString(),
        })
        .select('id, college_id, created_at')
        .single();
      if (error) throw error;
      return res.status(201).json({ ...data, colleges: college });
    }

    if (req.method === 'DELETE') {
      const body = await parseBody(req);
      const collegeId = body?.college_id || req.body?.college_id || req.query?.college_id;
      if (!collegeId) return res.status(400).json({ error: 'college_id is required' });
      const { error } = await supabase
        .from('saved_colleges')
        .delete()
        .eq('user_id', user.id)
        .eq('college_id', collegeId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('saved API error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
}
