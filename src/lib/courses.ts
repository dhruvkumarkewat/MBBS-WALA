/** Global medical courses supported across the platform */
export const UG_COURSES = [
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'BSMS',
  'BNYS',
] as const;

export const PG_COURSES = [
  'MD / MS',
  'MD',
  'MS',
  'Diploma',
  'DNB',
  'MDS',
] as const;

export const MEDICAL_COURSES = [
  ...UG_COURSES,
  ...PG_COURSES,
] as const;

export type MedicalCourse = (typeof MEDICAL_COURSES)[number];

export function isPGCourse(course?: string | null): boolean {
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

export const MEDICAL_COURSE_OPTIONS = [
  { value: 'All', label: 'All courses' },
  ...MEDICAL_COURSES.map((c) => ({ value: c, label: c })),
];

/** Counselling authorities typically used per course family */
export const COURSE_COUNSELLING: Record<
  MedicalCourse,
  { authorities: string[]; exam: string; notes: string }
> = {
  MBBS: {
    authorities: ['MCC (AIQ)', 'State Counselling', 'Deemed / Central'],
    exam: 'NEET UG',
    notes: 'All India + state quota medical counselling',
  },
  BDS: {
    authorities: ['MCC (AIQ)', 'State Counselling', 'Deemed / Central'],
    exam: 'NEET UG',
    notes: 'Dental seats via NEET UG counselling',
  },
  BAMS: {
    authorities: ['AACCC', 'State AYUSH', 'AIQ AYUSH'],
    exam: 'NEET UG',
    notes: 'Ayurveda via AACCC / state AYUSH counselling',
  },
  BHMS: {
    authorities: ['AACCC', 'State AYUSH', 'AIQ AYUSH'],
    exam: 'NEET UG',
    notes: 'Homoeopathy via AACCC / state AYUSH counselling',
  },
  BUMS: {
    authorities: ['AACCC', 'State AYUSH', 'AIQ AYUSH'],
    exam: 'NEET UG',
    notes: 'Unani via AACCC / state AYUSH counselling',
  },
  BSMS: {
    authorities: ['AACCC', 'State AYUSH', 'AIQ AYUSH'],
    exam: 'NEET UG',
    notes: 'Siddha via AACCC / state AYUSH counselling',
  },
  BNYS: {
    authorities: ['AACCC', 'State AYUSH', 'State Counselling'],
    exam: 'NEET UG',
    notes: 'Yoga & Naturopathy via AYUSH / state counselling',
  },
  'MD / MS': {
    authorities: ['MCC (AIQ 50%)', 'State Counselling (50%)', 'Central / Deemed'],
    exam: 'NEET PG / INI-CET',
    notes: 'Postgraduate Medical Specialities (MD/MS)',
  },
  MD: {
    authorities: ['MCC (AIQ 50%)', 'State Counselling (50%)', 'Central / Deemed'],
    exam: 'NEET PG / INI-CET',
    notes: 'Doctor of Medicine PG clinical & non-clinical branches',
  },
  MS: {
    authorities: ['MCC (AIQ 50%)', 'State Counselling (50%)', 'Central / Deemed'],
    exam: 'NEET PG / INI-CET',
    notes: 'Master of Surgery PG surgical specialities',
  },
  Diploma: {
    authorities: ['MCC (AIQ 50%)', 'State Counselling (50%)'],
    exam: 'NEET PG',
    notes: 'Postgraduate Medical Diploma courses',
  },
  DNB: {
    authorities: ['NBEMS / MCC (AIQ)'],
    exam: 'NEET PG',
    notes: 'Diplomate of National Board post-MBBS hospital training',
  },
  MDS: {
    authorities: ['MCC (AIQ 50%)', 'State Dental Counselling (50%)'],
    exam: 'NEET MDS',
    notes: 'Master of Dental Surgery PG specialities',
  },
};

export function isMedicalCourse(v: string | null | undefined): v is MedicalCourse {
  return !!v && (MEDICAL_COURSES as readonly string[]).includes(v);
}

export function courseLabel(course: string | null | undefined): string {
  if (!course) return 'MBBS';
  return course;
}

/** Default max marks for rank predictor by entrance context */
export function maxScoreForCourse(_course: string, exam = 'NEET UG'): number {
  if (exam === 'NEET PG') return 800;
  if (exam === 'NEET MDS') return 960;
  return 720;
}

/** Standard list of all 28 Indian States & 8 Union Territories */
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export type IndianState = typeof INDIAN_STATES[number];

/** Standard NEET counselling allotment rounds */
export const COUNSELLING_ROUNDS = [
  'All Rounds',
  'Round 1',
  'Round 2',
  'Round 3',
  'Mop Up',
  'Stray Vacancy',
] as const;

export type CounsellingRound = typeof COUNSELLING_ROUNDS[number];

export function getRoundMultiplier(round?: string | null): number {
  if (!round || round === 'All Rounds' || round === 'All' || round === 'Round 1') return 1.0;
  const rLower = String(round).toLowerCase();
  if (rLower.includes('2')) return 1.05;
  if (rLower.includes('3') || rLower.includes('mop')) return 1.12;
  if (rLower.includes('stray')) return 1.20;
  return 1.0;
}

