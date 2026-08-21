import supabase from './db-client.js';
import { setCors, requireUser } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { file_base64, file_name, mime_type } = req.body || {};

    if (!file_base64 || !file_name) {
      return res.status(400).json({ error: 'file_base64 and file_name are required' });
    }

    // Decode base64 to buffer
    const base64Data = file_base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const ext = (file_name.split('.').pop() || 'jpg').toLowerCase();
    const safeName = `${user.id}_${Date.now()}.${ext}`;
    const filePath = `payment-screenshots/${safeName}`;
    const contentType = mime_type || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      // Try creating bucket first if it doesn't exist
      if (uploadError.message?.includes('Bucket not found') || uploadError.statusCode === 404) {
        await supabase.storage.createBucket('payment-screenshots', { public: true }).catch(() => {});
        const retry = await supabase.storage
          .from('payment-screenshots')
          .upload(filePath, buffer, { contentType, upsert: false });
        if (retry.error) throw new Error(retry.error.message);
      } else {
        throw new Error(uploadError.message);
      }
    }

    const { data: urlData } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(filePath);

    return res.status(200).json({
      ok: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (err) {
    console.error('Upload API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
