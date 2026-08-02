import supabase from './db-client.js';

/** Shared medical course constants for API routes */
export const MEDICAL_COURSES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS'];

export const COURSE_META = {
  MBBS: { exam: 'NEET UG', authority: 'MCC / State', baseChoices: 4500 },
  BDS: { exam: 'NEET UG', authority: 'MCC / State', baseChoices: 1800 },
  BAMS: { exam: 'NEET UG', authority: 'AACCC / State AYUSH', baseChoices: 2200 },
  BHMS: { exam: 'NEET UG', authority: 'AACCC / State AYUSH', baseChoices: 1600 },
  BUMS: { exam: 'NEET UG', authority: 'AACCC / State AYUSH', baseChoices: 900 },
  BSMS: { exam: 'NEET UG', authority: 'AACCC / State AYUSH', baseChoices: 700 },
  BNYS: { exam: 'NEET UG', authority: 'AACCC / State', baseChoices: 600 },
};

export function normalizeCourse(value) {
  if (!value || value === 'All') return null;
  const up = String(value).trim().toUpperCase();
  const hit = MEDICAL_COURSES.find((c) => c === up);
  return hit || String(value).trim();
}

export function courseBaseChoices(course) {
  const c = normalizeCourse(course) || 'MBBS';
  return COURSE_META[c]?.baseChoices || 1200;
}

/**
 * Resolve college names for a course so cutoffs/seat_matrix (no course col)
 * can be filtered via name match. MBBS includes legacy null/empty course rows.
 */
export async function collegeNamesForCourse(course) {
  const c = normalizeCourse(course);
  if (!c) return null;

  let q = supabase.from('colleges').select('name');
  if (c === 'MBBS') {
    q = q.or('course.eq.MBBS,course.is.null');
  } else {
    q = q.eq('course', c);
  }
  const { data, error } = await q;
  if (error) throw error;
  const names = (data || []).map((r) => r.name).filter(Boolean);
  return names;
}

export function applyCourseFilterOnCollegesQuery(query, course) {
  const c = normalizeCourse(course);
  if (!c) return query;
  if (c === 'MBBS') {
    return query.or('course.eq.MBBS,course.is.null');
  }
  return query.eq('course', c);
}
