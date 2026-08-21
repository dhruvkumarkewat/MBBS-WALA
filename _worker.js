/**
 * Cloudflare Worker entry point
 * - Serves static frontend from ./dist (via ASSETS binding)
 * - Handles /api/* requests via the existing route handlers
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Inject env vars so existing handlers work
    try {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      }
    } catch (e) {}

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Route API requests to handlers
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // Serve static assets (React app)
    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request, env) {
  const url = new URL(request.url);
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Parse body
  let body = {};
  if (!['GET', 'HEAD'].includes(request.method)) {
    try {
      const ct = request.headers.get('content-type') || '';
      if (ct.includes('multipart/form-data')) {
        body = await request.formData().catch(() => new FormData());
      } else {
        body = await request.json().catch(() => ({}));
      }
    } catch (e) {}
  }

  // Build query params
  const query = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  // Path segments after /api/
  const pathAfterApi = url.pathname.replace(/^\/api\/?/, '');
  query.route = pathAfterApi ? pathAfterApi.split('/') : [];

  // Build Node-like headers
  const headers = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  // Fake body stream
  const bodyStr = body instanceof FormData ? '' : (typeof body === 'object' ? JSON.stringify(body) : String(body || ''));
  const encoder = new TextEncoder();
  const chunks = bodyStr ? [encoder.encode(bodyStr)] : [];
  let idx = 0;

  const req = {
    method: request.method,
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: url.pathname,
    headers,
    body,
    query,
    params: {},
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (idx < chunks.length) return Promise.resolve({ value: chunks[idx++], done: false });
          return Promise.resolve({ value: undefined, done: true });
        }
      };
    }
  };

  let status = 200;
  let resBody = '';
  let resHeaders = { ...responseHeaders };

  const res = {
    get statusCode() { return status; },
    set statusCode(v) { status = v; },
    status(code) { status = code; return res; },
    setHeader(k, v) { resHeaders[k] = v; return res; },
    getHeader(k) { return resHeaders[k.toLowerCase()]; },
    json(data) { resBody = JSON.stringify(data); return res; },
    send(data) { resBody = typeof data === 'object' ? JSON.stringify(data) : String(data); return res; },
    end(data) { if (data) resBody = typeof data === 'object' ? JSON.stringify(data) : String(data); return res; },
  };

  try {
    const { default: handler } = await import('./api/[...route].js');
    await handler(req, res);
  } catch (err) {
    console.error('[Worker] API error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: resHeaders });
  }

  return new Response(resBody || null, { status, headers: resHeaders });
}
