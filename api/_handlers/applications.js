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
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });
      if (error) throw error;

      if (!data?.length) {
        const seed = [
          {
            user_id: user.id,
            name: 'MCC AIQ UG',
            status: 'Draft',
            external_id: 'AIQ-PENDING',
            notes: 'Complete registration when portal opens',
            created_at: new Date().toISOString(),
          },
          {
            user_id: user.id,
            name: 'MP DME State Counselling',
            status: 'Draft',
            external_id: 'MP-PENDING',
            notes: 'Keep domicile docs ready',
            created_at: new Date().toISOString(),
          },
        ];
        const inserted = await supabase.from('applications').insert(seed).select();
        if (inserted.error) throw inserted.error;
        data = inserted.data;
      }
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { name, status, external_id, notes } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name is required' });
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          name,
          status: status || 'Draft',
          external_id: external_id || '',
          notes: notes || '',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status, notes, external_id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const patch = {};
      if (status) patch.status = status;
      if (notes != null) patch.notes = notes;
      if (external_id != null) patch.external_id = external_id;
      const { data, error } = await supabase
        .from('applications')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('applications API error:', err);
    res.status(500).json({ error: err.message });
  }
}
