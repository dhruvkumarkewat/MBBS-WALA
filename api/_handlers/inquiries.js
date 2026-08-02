import supabase from './db-client.js';
import { requireUser, setCors } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      // Protected: only authenticated staff/users can list inquiries
      const user = await requireUser(req, res);
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      // Allow any authenticated user for demo; tighten to role=admin when needed
      if (profile?.role && profile.role !== 'admin' && profile.role !== 'user') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('id', { ascending: false })
        .limit(50);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { name, email, phone, address, message } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (!phone || !String(phone).trim()) {
        return res.status(400).json({ error: 'Phone is required' });
      }
      if (String(phone).replace(/\D/g, '').length < 10) {
        return res.status(400).json({ error: 'Enter a valid phone number' });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email' });
      }

      const { data, error } = await supabase
        .from('inquiries')
        .insert({
          name: String(name).trim(),
          email: email ? String(email).trim() : '',
          phone: String(phone).trim(),
          address: address ? String(address).trim() : '',
          message: message ? String(message).trim() : '',
          source: 'mbbswala',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
