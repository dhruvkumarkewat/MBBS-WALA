/**
 * Cloudflare Pages Functions — API Bridge
 * Catches all /api/* requests and forwards them to the existing Node.js-style handlers.
 * Uses nodejs_compat flag (set in wrangler.toml) for crypto, Buffer, process.env support.
 */

export async function onRequest(context) {
  const { request, env, params } = context;

  // Inject Cloudflare env vars into process.env so existing handlers can read them
  try {
    for (const [key, value] of Object.entries(env || {})) {
      if (typeof value === 'string') {
        process.env[key] = value;
      }
    }
  } catch (e) {
    // process.env may be read-only in some environments — ignore
  }

  const url = new URL(request.url);

  // Parse body
  let body = undefined;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        body = await request.json().catch(() => ({}));
      } else {
        const text = await request.text().catch(() => '');
        try { body = JSON.parse(text); } catch { body = text; }
      }
    } catch (e) {
      body = {};
    }
  }

  // Build Node-like query object
  const query = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  // Extract route segments for req.query.route
  const routeSegments = params?.route;
  if (routeSegments) {
    query.route = Array.isArray(routeSegments)
      ? routeSegments
      : routeSegments.split('/');
  }

  // Build Node-like headers object
  const headers = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  // Build a fake readable stream for handlers that do `for await (const chunk of req)`
  const bodyStr = body && typeof body === 'object' ? JSON.stringify(body) : (body || '');
  const encoder = new TextEncoder();
  const bodyChunks = bodyStr ? [encoder.encode(bodyStr)] : [];
  let chunkIdx = 0;

  // Create Node-like req object
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
          if (chunkIdx < bodyChunks.length) {
            return Promise.resolve({ value: bodyChunks[chunkIdx++], done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        }
      };
    }
  };

  // Build Node-like res object
  let statusCode = 200;
  let responseBody = '';
  let responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  let ended = false;

  const res = {
    get statusCode() { return statusCode; },
    set statusCode(v) { statusCode = v; },
    status(code) {
      statusCode = code;
      return res;
    },
    setHeader(key, val) {
      responseHeaders[key] = val;
      return res;
    },
    getHeader(key) {
      return responseHeaders[key.toLowerCase()];
    },
    json(data) {
      responseHeaders['Content-Type'] = 'application/json';
      responseBody = JSON.stringify(data);
      ended = true;
      return res;
    },
    send(data) {
      responseBody = typeof data === 'object' ? JSON.stringify(data) : String(data);
      ended = true;
      return res;
    },
    end(data) {
      if (data) responseBody = typeof data === 'object' ? JSON.stringify(data) : String(data);
      ended = true;
      return res;
    },
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  try {
    // Dynamically import the main route handler
    const { default: handler } = await import('../api/[...route].js');
    await handler(req, res);
  } catch (err) {
    console.error('[CF Pages Function] Handler error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: err.message }),
      { status: 500, headers: responseHeaders }
    );
  }

  return new Response(responseBody || null, {
    status: statusCode,
    headers: responseHeaders,
  });
}
