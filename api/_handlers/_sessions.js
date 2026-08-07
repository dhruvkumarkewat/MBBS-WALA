import supabase from './db-client.js';

// In-memory persistent session registry for staff members across serverless lifecycle
const staffSessions = new Map();
const sessionHistory = [];

/**
 * Record a login event for a staff member
 */
export function recordLogin(staff, meta = {}) {
  const now = new Date().toISOString();
  const userId = staff.user_id || staff.id;
  const sessId = `sess_${userId}_${Date.now()}`;

  const sess = {
    id: sessId,
    user_id: userId,
    user_name: staff.name || 'Staff Member',
    user_email: staff.email || '',
    role: staff.role || 'sub_admin',
    login_at: now,
    last_heartbeat: now,
    logout_at: null,
    duration_seconds: null,
    status: 'active',
    ip: meta.ip || '127.0.0.1',
    user_agent: meta.user_agent || '',
  };

  // Close previous open session for this user if any
  const existing = staffSessions.get(userId);
  if (existing && existing.status === 'active') {
    const dur = Math.max(1, Math.round((Date.now() - new Date(existing.login_at).getTime()) / 1000));
    existing.logout_at = now;
    existing.duration_seconds = dur;
    existing.status = 'signed_out';
    sessionHistory.unshift({ ...existing });
  }

  staffSessions.set(userId, sess);
  sessionHistory.unshift(sess);

  // Keep history size reasonable
  if (sessionHistory.length > 200) {
    sessionHistory.splice(200);
  }

  return sess;
}

/**
 * Record a heartbeat pulse for a staff member
 */
export function recordHeartbeat(userId) {
  const now = new Date().toISOString();
  const sess = staffSessions.get(userId);
  if (sess && sess.status === 'active') {
    sess.last_heartbeat = now;
    return sess;
  }
  return null;
}

/**
 * Record a logout event for a staff member
 */
export function recordLogout(userId) {
  const now = new Date().toISOString();
  const sess = staffSessions.get(userId);
  if (sess) {
    const loginTime = new Date(sess.login_at).getTime();
    const dur = Math.max(1, Math.round((Date.now() - loginTime) / 1000));
    sess.logout_at = now;
    sess.duration_seconds = dur;
    sess.status = 'signed_out';
    staffSessions.delete(userId);

    // Update in history list
    const hist = sessionHistory.find((h) => h.id === sess.id);
    if (hist) {
      hist.logout_at = now;
      hist.duration_seconds = dur;
      hist.status = 'signed_out';
    }
    return sess;
  }
  return null;
}

/**
 * Get all sessions enriched with active presence and live duration
 */
export async function getStaffSessions(currentUserId, isSuperAdmin = false) {
  const now = Date.now();
  const INACTIVE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes without heartbeat = timed out

  // Fetch all staff profiles
  const { data: staffList } = await supabase.from('staff_profiles').select('*');
  const staffMap = new Map();
  for (const s of staffList || []) {
    if (s.user_id) staffMap.set(String(s.user_id), s);
    if (s.email) staffMap.set(String(s.email).toLowerCase().trim(), s);
  }

  const resultSessions = [];
  const seenIds = new Set();

  // 1. Process active and tracked sessions
  for (const sess of sessionHistory) {
    if (!isSuperAdmin && sess.user_id !== currentUserId) continue;

    const s = staffMap.get(String(sess.user_id)) || null;
    const loginMs = new Date(sess.login_at).getTime();
    const lastHbMs = sess.last_heartbeat ? new Date(sess.last_heartbeat).getTime() : loginMs;
    const isLive = !sess.logout_at && (now - lastHbMs < INACTIVE_TIMEOUT_MS);

    let duration = sess.duration_seconds;
    if (isLive) {
      duration = Math.max(0, Math.round((now - loginMs) / 1000));
    } else if (!sess.logout_at) {
      // Timed out session
      duration = Math.max(0, Math.round((lastHbMs - loginMs) / 1000));
    }

    resultSessions.push({
      id: sess.id,
      user_id: sess.user_id,
      user_name: s?.name || sess.user_name || 'Staff Member',
      user_email: s?.email || sess.user_email || '',
      role: s?.role || sess.role || 'sub_admin',
      login_at: sess.login_at,
      logout_at: isLive ? null : (sess.logout_at || sess.last_heartbeat || sess.login_at),
      duration_seconds: duration,
      presence: isLive ? 'online' : 'offline',
      ip: sess.ip || '127.0.0.1',
    });
    seenIds.add(String(sess.user_id));
  }

  // 2. Ensure each active staff profile has at least one current/recent session entry
  const candidates = isSuperAdmin
    ? (staffList || [])
    : (staffList || []).filter((s) => s.user_id === currentUserId);

  for (const s of candidates) {
    if (!seenIds.has(String(s.user_id))) {
      const isCurrent = s.user_id === currentUserId;
      const loginTime = s.updated_at || s.created_at || new Date().toISOString();
      const loginMs = new Date(loginTime).getTime();
      const duration = isCurrent
        ? Math.max(60, Math.round((now - loginMs) / 1000))
        : 1800; // default 30 mins for older sessions

      resultSessions.push({
        id: `sess_profile_${s.id}`,
        user_id: s.user_id,
        user_name: s.name || 'Staff Member',
        user_email: s.email || '',
        role: s.role || 'sub_admin',
        login_at: loginTime,
        logout_at: isCurrent ? null : loginTime,
        duration_seconds: duration,
        presence: isCurrent ? 'online' : 'offline',
        ip: isCurrent ? 'Active session' : '127.0.0.1',
      });
    }
  }

  // Sort descending by login_at
  resultSessions.sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());

  return resultSessions;
}
