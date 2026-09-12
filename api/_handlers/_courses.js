import supabase from './db-client.js';

/** Shared medical course constants for API routes */
export const UG_COURSES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS'];
export const PG_COURSES = ['MD / MS', 'MD', 'MS', 'Diploma', 'DNB', 'MDS'];
export const MEDICAL_COURSES = [...UG_COURSES, ...PG_COURSES];

export function isPGCourse(course) {
  if (!course) return false;
  const up = String(course).trim().toUpperCase();
  return (
    up === 'MD' ||
    up === 'MS' ||
    up === 'MD / MS' ||
    up === 'MD/MS' ||
    up === 'DIPLOMA' ||
    up === 'DNB' ||
    up === 'MDS' ||
    up.includes('PG')
  );
}

export const COURSE_META = {
  MBBS: { exam: 'NEET UG', authority: 'MCC / State', baseChoices: 4500 },
  BDS: { exam: 'NEET UG', authority: 'MCC / State', baseChoices: 1800 },
  BAMS: { exam: 'NEET UG', authority: 'AACCC / State AYUSH', baseChoices: 2200 },
  BHMS: { exam: 'NEET UG', authority: 'AACCC / State AYUSH', baseChoices: 1600 },
  BUMS: { exam: 'NEET UG', authority: 'AACCC / State AYUSH', baseChoices: 900 },
  BSMS: { exam: 'NEET UG', authority: 'AACCC / State AYUSH', baseChoices: 700 },
  BNYS: { exam: 'NEET UG', authority: 'AACCC / State', baseChoices: 600 },
  'MD / MS': { exam: 'NEET PG / INI-CET', authority: 'MCC / State 50%', baseChoices: 2000 },
  MD: { exam: 'NEET PG / INI-CET', authority: 'MCC / State 50%', baseChoices: 2500 },
  MS: { exam: 'NEET PG / INI-CET', authority: 'MCC / State 50%', baseChoices: 2000 },
  Diploma: { exam: 'NEET PG', authority: 'MCC / State 50%', baseChoices: 1000 },
  DNB: { exam: 'NEET PG', authority: 'NBEMS / MCC', baseChoices: 2200 },
  MDS: { exam: 'NEET MDS', authority: 'MCC / State 50%', baseChoices: 1200 },
};

export function normalizeCourse(value) {
  if (!value || value === 'All') return null;
  const up = String(value).trim().toUpperCase();
  const hit = MEDICAL_COURSES.find((c) => c.toUpperCase() === up);
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
  if (c === 'MBBS' || isPGCourse(c)) {
    if (c === 'MDS') {
      q = q.or('course.eq.MDS,course.eq.BDS,name.ilike.%Dental%,name.ilike.%Dentistry%,name.ilike.%BDS%');
    } else {
      q = q
        .or('course.eq.MBBS,course.is.null')
        .not('name', 'ilike', '%Dental%')
        .not('name', 'ilike', '%Dentistry%')
        .not('name', 'ilike', '%BDS%')
        .not('name', 'ilike', '%Ayurved%')
        .not('name', 'ilike', '%Homeopath%')
        .not('name', 'ilike', '%Unani%')
        .not('name', 'ilike', '%Nursing%');
    }
  } else if (c === 'BDS') {
    q = q.or('course.eq.BDS,name.ilike.%Dental%,name.ilike.%Dentistry%,name.ilike.%BDS%');
  } else if (c === 'BAMS') {
    q = q.or('course.eq.BAMS,name.ilike.%Ayurved%,name.ilike.%Ayush%');
  } else if (c === 'BHMS') {
    q = q.or('course.eq.BHMS,name.ilike.%Homeopath%,name.ilike.%Homoeopath%');
  } else if (c === 'BUMS') {
    q = q.or('course.eq.BUMS,name.ilike.%Unani%,name.ilike.%Tibbiya%');
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
    return query
      .or('course.eq.MBBS,course.is.null')
      .not('name', 'ilike', '%Dental%')
      .not('name', 'ilike', '%Dentistry%')
      .not('name', 'ilike', '%BDS%')
      .not('name', 'ilike', '%Ayurved%')
      .not('name', 'ilike', '%Homeopath%')
      .not('name', 'ilike', '%Unani%')
      .not('name', 'ilike', '%Nursing%');
  }
  if (c === 'BDS') {
    return query.or('course.eq.BDS,name.ilike.%Dental%,name.ilike.%Dentistry%,name.ilike.%BDS%');
  }
  if (c === 'MDS') {
    return query.or('course.eq.MDS,course.eq.BDS,name.ilike.%Dental%,name.ilike.%Dentistry%');
  }
  if (isPGCourse(c)) {
    // Medical colleges that offer PG degrees (MD, MS, Diploma, DNB)
    return query
      .or('course.eq.MBBS,course.eq.MD,course.eq.MS,course.is.null')
      .not('name', 'ilike', '%Dental%')
      .not('name', 'ilike', '%Dentistry%')
      .not('name', 'ilike', '%BDS%')
      .not('name', 'ilike', '%Ayurved%')
      .not('name', 'ilike', '%Homeopath%')
      .not('name', 'ilike', '%Unani%')
      .not('name', 'ilike', '%Nursing%');
  }
  if (c === 'BAMS') {
    return query.or('course.eq.BAMS,name.ilike.%Ayurved%,name.ilike.%Ayush%');
  }
  if (c === 'BHMS') {
    return query.or('course.eq.BHMS,name.ilike.%Homeopath%,name.ilike.%Homoeopath%');
  }
  if (c === 'BUMS') {
    return query.or('course.eq.BUMS,name.ilike.%Unani%,name.ilike.%Tibbiya%');
  }
  return query.eq('course', c);
}

export const COUNSELLING_ROUNDS = [
  'All Rounds',
  'Round 1',
  'Round 2',
  'Round 3',
  'Mop Up',
  'Stray Vacancy',
];

export function getRoundMultiplier(round) {
  if (!round || round === 'All Rounds' || round === 'All' || round === 'Round 1') return 1.0;
  const rLower = String(round).toLowerCase();
  if (rLower.includes('2')) return 1.05;
  if (rLower.includes('3') || rLower.includes('mop')) return 1.12;
  if (rLower.includes('stray')) return 1.20;
  return 1.0;
}
