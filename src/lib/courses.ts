/** Global medical courses supported across the platform */
export const MEDICAL_COURSES = [
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'BSMS',
  'BNYS',
] as const;

export type MedicalCourse = (typeof MEDICAL_COURSES)[number];

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

