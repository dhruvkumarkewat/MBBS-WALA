import aiPredict from './_handlers/ai-predict.js';
import adminActivity from './_handlers/admin-activity.js';
import adminAuth from './_handlers/admin-auth.js';
import adminDocuments from './_handlers/admin-documents.js';
import adminFollowups from './_handlers/admin-followups.js';
import adminMessages from './_handlers/admin-messages.js';
import adminNotes from './_handlers/admin-notes.js';
import adminNotify from './_handlers/admin-notify.js';
import adminOverview from './_handlers/admin-overview.js';
import adminPurchases from './_handlers/admin-purchases.js';
import adminSessions from './_handlers/admin-sessions.js';
import adminStaff from './_handlers/admin-staff.js';
import adminStudents from './_handlers/admin-students.js';
import adminWithdrawals from './_handlers/admin-withdrawals.js';
import applications from './_handlers/applications.js';
import badges from './_handlers/badges.js';
import blogs from './_handlers/blogs.js';
import careers from './_handlers/careers.js';
import challenges from './_handlers/challenges.js';
import choices from './_handlers/choices.js';
import collegeCompare from './_handlers/college-compare.js';
import collegeMatches from './_handlers/college-matches.js';
import colleges from './_handlers/colleges.js';
import competitionMap from './_handlers/competition-map.js';
import coupons from './_handlers/coupons.js';
import cutoffs from './_handlers/cutoffs.js';
import dashboardSummary from './_handlers/dashboard-summary.js';
import dbWake from './_handlers/db-wake.js';
import documents from './_handlers/documents.js';
import faqs from './_handlers/faqs.js';
import features from './_handlers/features.js';
import inquiries from './_handlers/inquiries.js';
import leaderboard from './_handlers/leaderboard.js';
import notifications from './_handlers/notifications.js';
import packagesHandler from './_handlers/packages.js';
import payment from './_handlers/payment.js';
import profile from './_handlers/profile.js';
import rankCalculator from './_handlers/rank-calculator.js';
import referrals from './_handlers/referrals.js';
import saved from './_handlers/saved.js';
import seatMatrix from './_handlers/seat-matrix.js';
import stats from './_handlers/stats.js';
import testimonials from './_handlers/testimonials.js';
import wallet from './_handlers/wallet.js';
import withdrawals from './_handlers/withdrawals.js';

const routes = {
  'ai-predict': aiPredict,
  'admin-activity': adminActivity,
  'admin-auth': adminAuth,
  'admin-documents': adminDocuments,
  'admin-followups': adminFollowups,
  'admin-messages': adminMessages,
  'admin-notes': adminNotes,
  'admin-notify': adminNotify,
  'admin-overview': adminOverview,
  'admin-purchases': adminPurchases,
  'admin-sessions': adminSessions,
  'admin-staff': adminStaff,
  'admin-students': adminStudents,
  'admin-withdrawals': adminWithdrawals,
  'applications': applications,
  'badges': badges,
  'blogs': blogs,
  'careers': careers,
  'challenges': challenges,
  'choices': choices,
  'college-compare': collegeCompare,
  'college-matches': collegeMatches,
  'colleges': colleges,
  'competition-map': competitionMap,
  'coupons': coupons,
  'cutoffs': cutoffs,
  'dashboard-summary': dashboardSummary,
  'db-wake': dbWake,
  'documents': documents,
  'faqs': faqs,
  'features': features,
  'inquiries': inquiries,
  'leaderboard': leaderboard,
  'notifications': notifications,
  'packages': packagesHandler,
  'payment': payment,
  'profile': profile,
  'rank-calculator': rankCalculator,
  'referrals': referrals,
  'saved': saved,
  'seat-matrix': seatMatrix,
  'stats': stats,
  'testimonials': testimonials,
  'wallet': wallet,
  'withdrawals': withdrawals,
  'debug-db': async (req, res) => {
    const { default: supabase } = await import('./_handlers/db-client.js');
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'FALLBACK';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'NONE';
    const { count } = await supabase.from('cutoffs').select('*', { count: 'exact', head: true });
    const { data: sample } = await supabase.from('cutoffs').select('college_name, aiq_rank, year, category').limit(5);
    const { count: colCount } = await supabase.from('colleges').select('*', { count: 'exact', head: true });
    res.status(200).json({ 
      db_url: url,
      anon_key: key,
      cutoffs_count: count, 
      colleges_count: colCount,
      sample,
      env_keys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('NEXT_PUBLIC'))
    });
  },
};

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    res.statusCode = 204;
    return res.end();
  }

  // Ensure res.status and res.json helpers exist
  if (!res.status) {
    res.status = function(code) {
      this.statusCode = code;
      return this;
    };
  }
  if (!res.json) {
    res.json = function(data) {
      this.setHeader('Content-Type', 'application/json');
      this.end(JSON.stringify(data));
    };
  }

  // Ensure req.query exists
  if (!req.query) {
    try {
      const urlObj = new URL(req.url || '', 'http://localhost');
      req.query = Object.fromEntries(urlObj.searchParams.entries());
    } catch {
      req.query = {};
    }
  }

  // Parse body if JSON string, buffer, or stream
  if (req.body === undefined && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString('utf-8');
      req.body = raw ? JSON.parse(raw) : {};
    } catch {
      req.body = {};
    }
  } else if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // keep as string
    }
  }

  // Determine route key from request
  let routeName = '';

  if (req.query && req.query.route) {
    const r = Array.isArray(req.query.route) ? req.query.route.join('-') : req.query.route;
    routeName = r.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
  }

  if (!routeName || !routes[routeName]) {
    const rawUrl = req.originalUrl || req.url || '';
    const cleanPath = rawUrl.split('?')[0].replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, '');
    const hyphenated = cleanPath.replace(/\//g, '-');
    if (routes[hyphenated]) {
      routeName = hyphenated;
    } else {
      const segments = cleanPath.split('/');
      routeName = segments[0] || '';
      if (segments.length > 1 && !req.query.id) {
        req.query.id = segments[1];
      }
    }
  }

  const endpoint = routes[routeName];

  if (!endpoint) {
    return res.status(404).json({
      error: `API endpoint '/api/${routeName}' not found`,
      available_routes: Object.keys(routes)
    });
  }

  try {
    await endpoint(req, res);
  } catch (err) {
    console.error(`[API Error] ${req.url}:`, err);
    if (typeof res.status === 'function') {
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal Server Error', details: err.message }));
    }
  }
}
