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
    up.includes('PG') ||
    up.startsWith('MD ') ||
    up.startsWith('MS ') ||
    up.startsWith('DNB ') ||
    up.startsWith('MDS ') ||
    up.startsWith('DGO') ||
    up.startsWith('DCH') ||
    up.startsWith('DMRD') ||
    up.startsWith('DA ')
  );
}

export const MEDICAL_COURSE_OPTIONS = [
  { value: 'All', label: 'All courses' },
  ...MEDICAL_COURSES.map((c) => ({ value: c, label: c })),
];

/* ── Comprehensive Course & Specialty Hierarchy by Field ── */

export type ExamTrack = 'MBBS_BDS' | 'AYUSH' | 'NEET_PG';

export interface CourseItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  degree: string;
  field: ExamTrack;
  category?: 'Clinical' | 'Para-Clinical' | 'Pre-Clinical' | 'Dental' | 'AYUSH' | 'General';
  description?: string;
}

/** MBBS / BDS Courses */
export const MBBS_BDS_COURSES: CourseItem[] = [
  {
    id: 'mbbs',
    code: 'MBBS',
    name: 'MBBS (Bachelor of Medicine & Bachelor of Surgery)',
    shortName: 'MBBS',
    degree: 'UG Medical',
    field: 'MBBS_BDS',
    category: 'General',
    description: 'Premier undergraduate medical degree for general physicians and surgeons.',
  },
  {
    id: 'bds',
    code: 'BDS',
    name: 'BDS (Bachelor of Dental Surgery)',
    shortName: 'BDS',
    degree: 'UG Dental',
    field: 'MBBS_BDS',
    category: 'Dental',
    description: 'Undergraduate dental surgery program accredited by DCI.',
  },
];

/** AYUSH Courses */
export const AYUSH_COURSES: CourseItem[] = [
  {
    id: 'bams',
    code: 'BAMS',
    name: 'BAMS (Bachelor of Ayurvedic Medicine & Surgery)',
    shortName: 'BAMS (Ayurveda)',
    degree: 'AYUSH',
    field: 'AYUSH',
    category: 'AYUSH',
    description: 'Traditional Indian medicine and ancient Ayurvedic clinical practice.',
  },
  {
    id: 'bhms',
    code: 'BHMS',
    name: 'BHMS (Bachelor of Homoeopathic Medicine & Surgery)',
    shortName: 'BHMS (Homeopathy)',
    degree: 'AYUSH',
    field: 'AYUSH',
    category: 'AYUSH',
    description: 'Holistic clinical medicine based on the principles of Homoeopathy.',
  },
  {
    id: 'bums',
    code: 'BUMS',
    name: 'BUMS (Bachelor of Unani Medicine & Surgery)',
    shortName: 'BUMS (Unani)',
    degree: 'AYUSH',
    field: 'AYUSH',
    category: 'AYUSH',
    description: 'Graeco-Arabic Unani-Tibb natural healthcare and therapeutics.',
  },
  {
    id: 'bsms',
    code: 'BSMS',
    name: 'BSMS (Bachelor of Siddha Medicine & Surgery)',
    shortName: 'BSMS (Siddha)',
    degree: 'AYUSH',
    field: 'AYUSH',
    category: 'AYUSH',
    description: 'Ancient Dravidian healing tradition practiced widely in South India.',
  },
  {
    id: 'bnys',
    code: 'BNYS',
    name: 'BNYS (Bachelor of Naturopathy & Yogic Sciences)',
    shortName: 'BNYS (Naturopathy & Yoga)',
    degree: 'AYUSH',
    field: 'AYUSH',
    category: 'AYUSH',
    description: 'Drugless alternative medical care, nature cure, and therapeutic yoga.',
  },
];

/** NEET PG — MD Courses (Doctor of Medicine) */
export const PG_MD_COURSES: CourseItem[] = [
  {
    id: 'md-gen-med',
    code: 'MD General Medicine',
    name: 'MD General Medicine',
    shortName: 'MD Gen Med',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Diagnosis and non-surgical management of adult systemic illnesses.',
  },
  {
    id: 'md-radio',
    code: 'MD Radiodiagnosis',
    name: 'MD Radiodiagnosis (Radiology)',
    shortName: 'MD Radiology',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Diagnostic imaging: MRI, CT, Ultrasound, X-ray, and interventional radiology.',
  },
  {
    id: 'md-derm',
    code: 'MD Dermatology',
    name: 'MD Dermatology, Venereology & Leprosy (DVL)',
    shortName: 'MD Dermatology (DVL)',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Disorders of skin, hair, nails, and sexually transmitted infections.',
  },
  {
    id: 'md-paed',
    code: 'MD Paediatrics',
    name: 'MD Paediatrics (Pediatrics)',
    shortName: 'MD Paediatrics',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Medical care of neonates, infants, children, and adolescents.',
  },
  {
    id: 'md-anesthesiology',
    code: 'MD Anaesthesiology',
    name: 'MD Anaesthesiology & Critical Care',
    shortName: 'MD Anaesthesia',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Perioperative care, critical care ICU, resuscitation, and pain medicine.',
  },
  {
    id: 'md-pulm',
    code: 'MD Respiratory Medicine',
    name: 'MD Respiratory Medicine / Pulmonology',
    shortName: 'MD Pulmonology',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Pulmonary diseases, asthma, tuberculosis, COPD, and interventional bronchoscopy.',
  },
  {
    id: 'md-psych',
    code: 'MD Psychiatry',
    name: 'MD Psychiatry',
    shortName: 'MD Psychiatry',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Diagnosis, prevention, and treatment of mental, behavioral, and emotional disorders.',
  },
  {
    id: 'md-emerg',
    code: 'MD Emergency Medicine',
    name: 'MD Emergency Medicine',
    shortName: 'MD Emergency Med',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Acute emergency resuscitation, trauma management, and disaster response.',
  },
  {
    id: 'md-rad-onc',
    code: 'MD Radiation Oncology',
    name: 'MD Radiation Oncology / Radiotherapy',
    shortName: 'MD Radiation Oncology',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Ionizing radiation therapy and multimodality management of malignant tumors.',
  },
  {
    id: 'md-path',
    code: 'MD Pathology',
    name: 'MD Pathology',
    shortName: 'MD Pathology',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Para-Clinical',
    description: 'Histopathology, cytopathology, hematology, and clinical laboratory diagnostics.',
  },
  {
    id: 'md-micro',
    code: 'MD Microbiology',
    name: 'MD Microbiology',
    shortName: 'MD Microbiology',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Para-Clinical',
    description: 'Bacteriology, virology, mycology, parasitology, and hospital infection control.',
  },
  {
    id: 'md-pharm',
    code: 'MD Pharmacology',
    name: 'MD Pharmacology',
    shortName: 'MD Pharmacology',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Para-Clinical',
    description: 'Drug discovery, clinical trials, pharmacovigilance, and therapeutic regimens.',
  },
  {
    id: 'md-comm-med',
    code: 'MD Community Medicine',
    name: 'MD Community Medicine (PSM)',
    shortName: 'MD Community Med',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Para-Clinical',
    description: 'Preventive healthcare, epidemiology, national health programs, and public health.',
  },
  {
    id: 'md-forensic',
    code: 'MD Forensic Medicine',
    name: 'MD Forensic Medicine & Toxicology',
    shortName: 'MD Forensic Med',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Para-Clinical',
    description: 'Medicolegal investigations, autopsy pathology, and clinical toxicology.',
  },
  {
    id: 'md-biochem',
    code: 'MD Biochemistry',
    name: 'MD Biochemistry',
    shortName: 'MD Biochemistry',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Pre-Clinical',
    description: 'Clinical biochemistry, molecular diagnostics, endocrinology, and metabolic assays.',
  },
  {
    id: 'md-physio',
    code: 'MD Physiology',
    name: 'MD Physiology',
    shortName: 'MD Physiology',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Pre-Clinical',
    description: 'Human organ system function, neurophysiology, and clinical autonomic evaluation.',
  },
  {
    id: 'md-anat',
    code: 'MD Anatomy',
    name: 'MD Anatomy',
    shortName: 'MD Anatomy',
    degree: 'MD',
    field: 'NEET_PG',
    category: 'Pre-Clinical',
    description: 'Gross anatomy, neuroanatomy, embryology, histology, and surgical anatomy.',
  },
];

/** NEET PG — MS Courses (Master of Surgery) */
export const PG_MS_COURSES: CourseItem[] = [
  {
    id: 'ms-gen-surg',
    code: 'MS General Surgery',
    name: 'MS General Surgery',
    shortName: 'MS General Surgery',
    degree: 'MS',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Comprehensive operative surgical care of abdomen, trauma, endocrine, and oncology.',
  },
  {
    id: 'ms-obgyn',
    code: 'MS Obstetrics & Gynaecology',
    name: 'MS Obstetrics & Gynaecology (OBGYN)',
    shortName: 'MS OBGYN',
    degree: 'MS',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Maternal-fetal health, high-risk pregnancy, and reproductive surgical medicine.',
  },
  {
    id: 'ms-ortho',
    code: 'MS Orthopaedics',
    name: 'MS Orthopaedics',
    shortName: 'MS Orthopaedics',
    degree: 'MS',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Musculoskeletal surgery, joint replacement, spine surgery, and trauma arthroplasty.',
  },
  {
    id: 'ms-ophthalmology',
    code: 'MS Ophthalmology',
    name: 'MS Ophthalmology (Eye Surgery)',
    shortName: 'MS Ophthalmology',
    degree: 'MS',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Surgical and medical care of eye diseases, cataracts, retina, and cornea.',
  },
  {
    id: 'ms-ent',
    code: 'MS ENT',
    name: 'MS ENT (Otorhinolaryngology)',
    shortName: 'MS ENT',
    degree: 'MS',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'Ear, nose, throat, head and neck surgery, endoscopic skull base procedures.',
  },
];

/** NEET PG — Diploma Courses (Postgraduate Medical Diplomas) */
export const PG_DIPLOMA_COURSES: CourseItem[] = [
  {
    id: 'diploma-dgo',
    code: 'DGO',
    name: 'DGO (Diploma in Obstetrics & Gynaecology)',
    shortName: 'DGO (OBGYN)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in maternal and reproductive healthcare.',
  },
  {
    id: 'diploma-dch',
    code: 'DCH',
    name: 'DCH (Diploma in Child Health)',
    shortName: 'DCH (Pediatrics)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in pediatric medicine and infant healthcare.',
  },
  {
    id: 'diploma-dmrd',
    code: 'DMRD',
    name: 'DMRD (Diploma in Medical Radio-Diagnosis)',
    shortName: 'DMRD (Radiology)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in medical imaging and diagnostic radiology.',
  },
  {
    id: 'diploma-da',
    code: 'DA',
    name: 'DA (Diploma in Anaesthesiology)',
    shortName: 'DA (Anaesthesia)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in surgical anaesthesia and intensive resuscitation.',
  },
  {
    id: 'diploma-dlo',
    code: 'DLO',
    name: 'DLO (Diploma in Otolaryngology / ENT)',
    shortName: 'DLO (ENT)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in ear, nose, and throat surgical management.',
  },
  {
    id: 'diploma-do',
    code: 'DO',
    name: 'DO (Diploma in Ophthalmology)',
    shortName: 'DO (Eye)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in comprehensive eye examination and eye surgery.',
  },
  {
    id: 'diploma-ddvl',
    code: 'DDVL',
    name: 'DDVL / DVD (Diploma in Dermatology & Venereology)',
    shortName: 'DDVL (Dermatology)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in skin disease diagnostics and cosmetology.',
  },
  {
    id: 'diploma-dpm',
    code: 'DPM',
    name: 'DPM (Diploma in Psychological Medicine)',
    shortName: 'DPM (Psychiatry)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in clinical psychiatry and behavioral healthcare.',
  },
  {
    id: 'diploma-dtcd',
    code: 'DTCD',
    name: 'DTCD (Diploma in Tuberculosis & Chest Diseases)',
    shortName: 'DTCD (Pulmonary)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Clinical',
    description: '2-year PG diploma in pulmonary medicine and tuberculosis management.',
  },
  {
    id: 'diploma-dcp',
    code: 'DCP',
    name: 'DCP (Diploma in Clinical Pathology)',
    shortName: 'DCP (Pathology)',
    degree: 'Diploma',
    field: 'NEET_PG',
    category: 'Para-Clinical',
    description: '2-year PG diploma in clinical laboratory testing and diagnostic pathology.',
  },
];

/** NEET PG — DNB Courses */
export const PG_DNB_COURSES: CourseItem[] = [
  {
    id: 'dnb-gen-med',
    code: 'DNB General Medicine',
    name: 'DNB General Medicine',
    shortName: 'DNB Gen Med',
    degree: 'DNB',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'National Board accredited 3-year residency in Internal Medicine.',
  },
  {
    id: 'dnb-gen-surg',
    code: 'DNB General Surgery',
    name: 'DNB General Surgery',
    shortName: 'DNB Gen Surgery',
    degree: 'DNB',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'National Board accredited 3-year residency in General Surgery.',
  },
  {
    id: 'dnb-radio',
    code: 'DNB Radiodiagnosis',
    name: 'DNB Radiodiagnosis',
    shortName: 'DNB Radiology',
    degree: 'DNB',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'National Board accredited 3-year residency in Diagnostic Radiology.',
  },
  {
    id: 'dnb-paed',
    code: 'DNB Paediatrics',
    name: 'DNB Paediatrics',
    shortName: 'DNB Paediatrics',
    degree: 'DNB',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'National Board accredited 3-year residency in Pediatric Medicine.',
  },
  {
    id: 'dnb-ortho',
    code: 'DNB Orthopaedics',
    name: 'DNB Orthopaedics',
    shortName: 'DNB Orthopaedics',
    degree: 'DNB',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'National Board accredited 3-year residency in Orthopaedic Surgery.',
  },
  {
    id: 'dnb-obgyn',
    code: 'DNB Obstetrics & Gynaecology',
    name: 'DNB Obstetrics & Gynaecology',
    shortName: 'DNB OBGYN',
    degree: 'DNB',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'National Board accredited 3-year residency in Obstetrics & Gynaecology.',
  },
  {
    id: 'dnb-anesthesiology',
    code: 'DNB Anaesthesiology',
    name: 'DNB Anaesthesiology',
    shortName: 'DNB Anaesthesia',
    degree: 'DNB',
    field: 'NEET_PG',
    category: 'Clinical',
    description: 'National Board accredited 3-year residency in Anaesthesia and Intensive Care.',
  },
];

/** NEET MDS Courses */
export const PG_MDS_COURSES: CourseItem[] = [
  {
    id: 'mds-ortho',
    code: 'MDS Orthodontics',
    name: 'MDS Orthodontics & Dentofacial Orthopedics',
    shortName: 'MDS Orthodontics',
    degree: 'MDS',
    field: 'NEET_PG',
    category: 'Dental',
    description: 'Specialization in dentofacial aesthetics and malocclusion correction.',
  },
  {
    id: 'mds-oral-surg',
    code: 'MDS Oral Surgery',
    name: 'MDS Oral & Maxillofacial Surgery',
    shortName: 'MDS Oral Surgery',
    degree: 'MDS',
    field: 'NEET_PG',
    category: 'Dental',
    description: 'Maxillofacial trauma, orthognathic surgery, and dental reconstruction.',
  },
  {
    id: 'mds-cons-end',
    code: 'MDS Conservative Dentistry',
    name: 'MDS Conservative Dentistry & Endodontics',
    shortName: 'MDS Endodontics',
    degree: 'MDS',
    field: 'NEET_PG',
    category: 'Dental',
    description: 'Microscopic endodontic therapy and tooth preservation restorative care.',
  },
  {
    id: 'mds-prostho',
    code: 'MDS Prosthodontics',
    name: 'MDS Prosthodontics & Crown Bridge',
    shortName: 'MDS Prosthodontics',
    degree: 'MDS',
    field: 'NEET_PG',
    category: 'Dental',
    description: 'Dental implants, full mouth rehabilitations, and maxillofacial prosthetics.',
  },
  {
    id: 'mds-perio',
    code: 'MDS Periodontology',
    name: 'MDS Periodontology',
    shortName: 'MDS Periodontics',
    degree: 'MDS',
    field: 'NEET_PG',
    category: 'Dental',
    description: 'Periodontal plastic surgery and bone regenerative tissue therapies.',
  },
];

/** All PG Courses unified */
export const ALL_PG_COURSES: CourseItem[] = [
  ...PG_MD_COURSES,
  ...PG_MS_COURSES,
  ...PG_DIPLOMA_COURSES,
  ...PG_DNB_COURSES,
  ...PG_MDS_COURSES,
];

/** All system courses grouped */
export const ALL_SYSTEM_COURSES: CourseItem[] = [
  ...MBBS_BDS_COURSES,
  ...AYUSH_COURSES,
  ...ALL_PG_COURSES,
];

export const PG_DEGREE_CATEGORIES = [
  { id: 'ALL', label: 'All PG Courses', short: 'All PG' },
  { id: 'MD', label: 'MD Courses', short: 'MD' },
  { id: 'MS', label: 'MS Courses', short: 'MS' },
  { id: 'Diploma', label: 'Diploma Courses', short: 'Diploma' },
  { id: 'DNB', label: 'DNB Courses', short: 'DNB' },
  { id: 'MDS', label: 'MDS Courses', short: 'MDS' },
] as const;

/** Retrieve courses for a specific exam track */
export function getCoursesForField(field: ExamTrack): CourseItem[] {
  switch (field) {
    case 'MBBS_BDS':
      return MBBS_BDS_COURSES;
    case 'AYUSH':
      return AYUSH_COURSES;
    case 'NEET_PG':
      return ALL_PG_COURSES;
    default:
      return MBBS_BDS_COURSES;
  }
}

/** Retrieve PG courses filtered by degree category */
export function getPGCoursesForDegree(degree: string): CourseItem[] {
  if (!degree || degree === 'ALL' || degree === 'All') return ALL_PG_COURSES;
  const up = degree.toUpperCase();
  if (up === 'MD') return PG_MD_COURSES;
  if (up === 'MS') return PG_MS_COURSES;
  if (up === 'DIPLOMA') return PG_DIPLOMA_COURSES;
  if (up === 'DNB') return PG_DNB_COURSES;
  if (up === 'MDS') return PG_MDS_COURSES;
  return ALL_PG_COURSES.filter((c) => c.degree.toUpperCase() === up);
}

/** Find full course detail by code or id */
export function findCourseByCode(codeOrName?: string | null): CourseItem | null {
  if (!codeOrName || codeOrName === 'All') return null;
  const target = codeOrName.toLowerCase().trim();
  return (
    ALL_SYSTEM_COURSES.find(
      (c) =>
        c.code.toLowerCase() === target ||
        c.id.toLowerCase() === target ||
        c.name.toLowerCase() === target ||
        c.shortName.toLowerCase() === target
    ) || null
  );
}

/** Return the appropriate exam field for a given course name */
export function getFieldForCourse(course?: string | null): ExamTrack {
  if (!course) return 'MBBS_BDS';
  const c = course.toUpperCase();
  if (c.includes('BAMS') || c.includes('BHMS') || c.includes('BUMS') || c.includes('BSMS') || c.includes('BNYS') || c.includes('AYUSH')) {
    return 'AYUSH';
  }
  if (
    c.includes('MD') ||
    c.includes('MS') ||
    c.includes('DIPLOMA') ||
    c.includes('DNB') ||
    c.includes('DGO') ||
    c.includes('DCH') ||
    c.includes('DMRD') ||
    c.includes('DA') ||
    c.includes('PG')
  ) {
    return 'NEET_PG';
  }
  return 'MBBS_BDS';
}

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
