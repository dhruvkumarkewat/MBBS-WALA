import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

const DEFAULT_DOCS = [
  'NEET scorecard',
  'Aadhaar / ID proof',
  'Domicile certificate',
  'Category certificate',
  'Passport photo',
  'Signature scan',
  '10th marksheet',
  '12th marksheet',
];

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
  'image/heic',
]);

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      let { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true });
      if (error) throw error;

      if (!data?.length) {
        const rows = DEFAULT_DOCS.map((name) => ({
          user_id: user.id,
          name,
          status: 'Pending',
          file_url: '',
          updated_at: new Date().toISOString(),
        }));
        const inserted = await supabase.from('user_documents').insert(rows).select();
        if (inserted.error) throw inserted.error;
        data = inserted.data;
      }
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { id, fileName, fileBase64, contentType } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Document id is required' });
      if (!fileName || !fileBase64) {
        return res.status(400).json({ error: 'fileName and fileBase64 are required' });
      }

      const mime = (contentType || 'application/octet-stream').toLowerCase();
      if (!ALLOWED_TYPES.has(mime)) {
        return res.status(400).json({
          error: 'Only PDF, JPG, PNG or WEBP files are allowed',
        });
      }

      // Verify ownership
      const existing = await supabase
        .from('user_documents')
        .select('id, name')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) return res.status(404).json({ error: 'Document not found' });

      const buffer = Buffer.from(fileBase64, 'base64');
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large (max 10MB)' });
      }

      const safeName = String(fileName)
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 120);
      const path = `${user.id}/${id}-${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from('user-documents')
        .upload(path, buffer, { contentType: mime, upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('user-documents').getPublicUrl(path);
      const file_url = urlData.publicUrl;

      const { data, error } = await supabase
        .from('user_documents')
        .update({
          status: 'Uploaded',
          file_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status, file_url } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const patch = { updated_at: new Date().toISOString() };
      if (status) patch.status = status;
      if (file_url != null) patch.file_url = file_url;

      const { data, error } = await supabase
        .from('user_documents')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { data: row, error: findErr } = await supabase
        .from('user_documents')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!row) return res.status(404).json({ error: 'Not found' });

      const { data, error } = await supabase
        .from('user_documents')
        .update({
          status: 'Pending',
          file_url: '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('documents API error:', err);
    res.status(500).json({ error: err.message });
  }
}
