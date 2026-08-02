import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        const seed = {
          id: user.id,
          email: user.email || '',
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'Student'),
          phone: user.user_metadata?.phone || '',
          category: 'General',
          domicile: 'Madhya Pradesh',
          exam: 'NEET UG',
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const inserted = await supabase.from('profiles').insert(seed).select().single();
        if (inserted.error) throw inserted.error;
        data = inserted.data;
      }

      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const patch = {
        full_name: body.full_name,
        phone: body.phone,
        category: body.category,
        domicile: body.domicile,
        exam: body.exam,
        score: body.score != null ? Number(body.score) : undefined,
        predicted_rank_min:
          body.predicted_rank_min != null ? Number(body.predicted_rank_min) : undefined,
        predicted_rank_max:
          body.predicted_rank_max != null ? Number(body.predicted_rank_max) : undefined,
        updated_at: new Date().toISOString(),
      };
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email || '', ...patch }, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('profile API error:', err);
    res.status(500).json({ error: err.message });
  }
}
