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
      const { data: list, error: err } = await supabase
        .from('saved_colleges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (err) throw err;

      let collegeMap = {};
      if (list && list.length > 0) {
        const idStrs = list.map((l) => l.college_id.toString(16).padStart(10, '0'));
        const { data: colleges, error: cErr } = await supabase
          .from('colleges')
          .select('id, name, city, state, country, college_type, course, source')
          .in('id', idStrs);
        if (cErr) throw cErr;
        collegeMap = Object.fromEntries((colleges || []).map((c) => [c.id, c]));
      }

      const hydrated = list.map((row) => {
        const idStr = row.college_id.toString(16).padStart(10, '0');
        return {
          ...row,
          college_id: idStr, // Provide string ID to frontend
          colleges: collegeMap[idStr] || null,
        };
      });
      return res.status(200).json(hydrated);
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const collegeIdStr = body?.college_id || req.query?.college_id;
      if (!collegeIdStr) return res.status(400).json({ error: 'college_id is required' });
      
      const collegeIdNum = /^[0-9a-f]+$/i.test(collegeIdStr) ? parseInt(collegeIdStr, 16) : Number(collegeIdStr);
      if (isNaN(collegeIdNum)) return res.status(400).json({ error: 'invalid college_id' });

      // Ensure college exists
      const { data: college, error: findErr } = await supabase
        .from('colleges')
        .select('id, name, city, state, country, college_type, course')
        .eq('id', collegeIdStr)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!college) return res.status(404).json({ error: 'College not found' });

      const { data: existing } = await supabase
        .from('saved_colleges')
        .select('id, college_id, created_at')
        .eq('user_id', user.id)
        .eq('college_id', collegeIdNum)
        .maybeSingle();
      if (existing) {
        return res.status(200).json({ ...existing, college_id: collegeIdStr, colleges: college });
      }

      const { data, error } = await supabase
        .from('saved_colleges')
        .insert({
          user_id: user.id,
          college_id: collegeIdNum,
          created_at: new Date().toISOString(),
        })
        .select('id, college_id, created_at')
        .single();
      if (error) throw error;
      return res.status(201).json({ ...data, college_id: collegeIdStr, colleges: college });
    }

    if (req.method === 'DELETE') {
      const body = await parseBody(req);
      const collegeIdStr = body?.college_id || req.body?.college_id || req.query?.college_id;
      if (!collegeIdStr) return res.status(400).json({ error: 'college_id is required' });
      
      const collegeIdNum = /^[0-9a-f]+$/i.test(collegeIdStr) ? parseInt(collegeIdStr, 16) : Number(collegeIdStr);
      if (isNaN(collegeIdNum)) return res.status(400).json({ error: 'invalid college_id' });

      const { error } = await supabase
        .from('saved_colleges')
        .delete()
        .eq('user_id', user.id)
        .eq('college_id', collegeIdNum);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('saved API error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
}
