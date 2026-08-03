import supabase from './db-client.js';
import { requireUser } from './_auth.js';

export async function getStaffProfile(userId) {
  try {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      // Table may not exist or user is not staff
      return null;
    }
    return data || null;
  } catch {
    return null;
  }
}

export async function requireStaff(req, res, { roles = ['super_admin', 'sub_admin'] } = {}) {
  const user = await requireUser(req, res);
  if (!user) return null;

  const staff = await getStaffProfile(user.id);
  if (!staff || !staff.is_active || !roles.includes(staff.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return { user, staff };
}

export async function requireSuperAdmin(req, res) {
  return requireStaff(req, res, { roles: ['super_admin'] });
}

export async function logActivity(staffId, action, entityType = null, entityId = null, meta = {}) {
  try {
    await supabase.from('activity_logs').insert({
      staff_id: staffId,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      meta,
      created_at: new Date().toISOString(),
    });
      // Columns don't exist in schema currently
  } catch (e) {
    console.error('logActivity failed', e);
  }
}

export async function touchPresence(staffId, presence = 'online') {
  // Presence columns don't exist in schema currently, ignore
}

/** Send in-app notification to one or many user ids (students or staff). */
export async function notifyUsers(userIds, title, body) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length || !title || !body) return 0;
  const now = new Date().toISOString();
  const rows = ids.map((user_id) => ({
    user_id,
    title,
    body,
    read: false,
    created_at: now,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    console.error('notifyUsers failed', error);
    throw error;
  }
  return rows.length;
}

/**
 * When a purchase/course is assigned to a counsellor:
 * notify the student (if linked account) AND the sub-admin.
 */
export async function notifyAssignment({
  student,
  staffId,
  staffName,
  packageName,
  assignedByName = 'Super Admin',
}) {
  const pkg = packageName || student?.purchased_counselling || student?.purchased_course || 'Counselling package';
  const studentName = student?.full_name || 'Student';
  const counsellor = staffName || 'your counsellor';

  const jobs = [];

  if (staffId) {
    jobs.push(
      notifyUsers(
        [staffId],
        'New student assigned to you',
        `${studentName} purchased “${pkg}” and was assigned to you by ${assignedByName}. Open Admin → My Students to start counselling.`
      )
    );
  }

  if (student?.user_id) {
    jobs.push(
      notifyUsers(
        [student.user_id],
        'Counsellor assigned to your package',
        `Good news! ${counsellor} is now your dedicated counsellor for “${pkg}”. They will guide you on next steps. Check Dashboard → Notifications.`
      )
    );
  }

  const results = await Promise.all(jobs);
  return results.reduce((a, b) => a + b, 0);
}
