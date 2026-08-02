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
