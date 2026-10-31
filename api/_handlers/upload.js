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

    // Whitelist allowed file types (payment screenshots only)
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf'];
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    const ext = (file_name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: 'File type not allowed. Allowed: jpg, jpeg, png, webp, heic, pdf' });
    }

    const resolvedMime = (mime_type && ALLOWED_MIME_TYPES.includes(mime_type.toLowerCase()))
      ? mime_type.toLowerCase()
      : ('image/' + (ext === 'jpg' ? 'jpeg' : ext));

    if (!ALLOWED_MIME_TYPES.includes(resolvedMime)) {
      return res.status(400).json({ error: 'Invalid MIME type. Only images and PDFs are allowed.' });
    }

    // Decode base64 to buffer
    const base64Data = file_base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Enforce file size limit (10 MB)
    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(413).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
    }

    const safeName = user.id + '_' + Date.now() + '.' + ext;
    const filePath = 'payment-screenshots/' + safeName;
    const contentType = resolvedMime;

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
