import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireStaff } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireStaff(req, res);
    if (!ctx) return;
    const { user, staff } = ctx;
    const isSuper = staff.role === 'super_admin';

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    let studentsQ = supabase.from('student_counselling').select('*').order('updated_at', { ascending: false });
    if (!isSuper) studentsQ = studentsQ.eq('assigned_to', user.id);
    const { data: students } = await studentsQ;
    const list = students || [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let actQ = supabase
      .from('activity_logs')
      .select('*')
      .gte('created_at', todayStart.toISOString())
      .order('id', { ascending: false })
      .limit(40);
    if (!isSuper) actQ = actQ.eq('staff_id', user.id);
    const { data: todayActivity } = await actQ;

    let fuQ = supabase
      .from('counselling_followups')
      .select('*')
      .eq('status', 'pending')
      .order('due_at', { ascending: true });
    if (!isSuper) fuQ = fuQ.eq('staff_id', user.id);
    const { data: followups } = await fuQ;

    let staffList = [];
    if (isSuper) {
      const { data } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('role', 'sub_admin')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });
      staffList = data || [];

      staffList = await Promise.all(
        staffList.map(async (s) => {
          const mine = list.filter((st) => st.assigned_to === s.user_id);
          return {
            ...s,
            assigned_count: mine.length,
            pending_count: mine.filter((x) =>
              ['new', 'assigned', 'in_progress', 'follow_up'].includes(x.counselling_status)
            ).length,
            completed_count: mine.filter((x) => x.counselling_status === 'completed').length,
            admitted_count: mine.filter((x) => x.counselling_status === 'admitted').length,
          };
        })
      );
    }

    const { data: purchases } = isSuper
      ? await supabase.from('purchases').select('*').order('id', { ascending: false }).limit(12)
      : { data: [] };

    const { data: withdrawals } = isSuper
      ? await supabase.from('withdrawals').select('*').order('id', { ascending: false }).limit(12)
      : { data: [] };

    // Staff name map for activity
    const staffIds = [...new Set((todayActivity || []).map((a) => a.staff_id).filter(Boolean))];
    let staffNames = {};
    if (staffIds.length) {
      const { data: sn } = await supabase
        .from('staff_profiles')
        .select('user_id, full_name')
        .in('user_id', staffIds);
      staffNames = Object.fromEntries((sn || []).map((s) => [s.user_id, s.full_name]));
    }

    const paidPurchases = (purchases || []).filter((p) => p.status === 'paid');
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthRevenue = paidPurchases
      .filter((p) => p.created_at && new Date(p.created_at) >= monthStart)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const unassignedPaid = list.filter(
      (s) =>
        s.payment_status === 'paid' &&
        (!s.assigned_to || s.counselling_status === 'unassigned' || s.counselling_status === 'new')
    ).length;

    const stats = {
      total_students: list.length,
      pending: list.filter((s) =>
        ['new', 'assigned', 'in_progress', 'follow_up', 'unassigned'].includes(s.counselling_status)
      ).length,
      in_progress: list.filter((s) => s.counselling_status === 'in_progress').length,
      completed: list.filter((s) => s.counselling_status === 'completed').length,
      admitted: list.filter((s) => s.counselling_status === 'admitted').length,
      contacted_today: (todayActivity || []).filter((a) => a.action === 'Contacted Student').length,
      sessions_today: (todayActivity || []).filter((a) =>
        ['Marked Counselling Complete', 'Closed Counselling', 'Added Counselling Note'].includes(a.action)
      ).length,
      pending_followups: (followups || []).length,
      online_staff: staffList.filter((s) => s.presence === 'online').length,
      total_staff: staffList.length,
      revenue: paidPurchases.reduce((s, p) => s + (Number(p.amount) || 0), 0),
      month_revenue: monthRevenue,
      paid_students: list.filter((s) => s.payment_status === 'paid').length,
      unassigned_paid: unassignedPaid,
      pending_withdrawals: (withdrawals || []).filter((w) => w.status === 'pending').length,
      conversion_rate:
        list.length > 0
          ? Math.round((list.filter((s) => s.counselling_status === 'admitted').length / list.length) * 100)
          : 0,
    };

    const pipeline = [
      { key: 'new', label: 'New / Unassigned', count: list.filter((s) => ['new', 'unassigned'].includes(s.counselling_status)).length },
      { key: 'assigned', label: 'Assigned', count: list.filter((s) => s.counselling_status === 'assigned').length },
      { key: 'in_progress', label: 'In progress', count: list.filter((s) => s.counselling_status === 'in_progress').length },
      { key: 'follow_up', label: 'Follow-up', count: list.filter((s) => s.counselling_status === 'follow_up').length },
      { key: 'completed', label: 'Completed', count: list.filter((s) => s.counselling_status === 'completed').length },
      { key: 'admitted', label: 'Admitted', count: list.filter((s) => s.counselling_status === 'admitted').length },
    ];

    return res.status(200).json({
      role: staff.role,
      staff,
      stats,
      pipeline,
      students: list.slice(0, 10),
      todayActivity: (todayActivity || []).map((a) => ({
        ...a,
        staff_name: staffNames[a.staff_id] || 'Staff',
      })),
      followups: followups || [],
      staffList,
      purchases: purchases || [],
      withdrawals: (withdrawals || []).filter((w) => w.status === 'pending'),
    });
  } catch (err) {
    console.error('admin-overview error', err);
    res.status(500).json({ error: err.message });
  }
}
