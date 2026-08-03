import { getAdminClient } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('seed-historical');

const HISTORICAL_COLLEGES = [
  // MCC Colleges
  {
    name: 'All India Institute of Medical Sciences (AIIMS), New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'Maulana Azad Medical College (MAMC)',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'VMMC and Safdarjung Hospital',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'All India Institute of Medical Sciences (AIIMS), Bhopal',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'All India Institute of Medical Sciences (AIIMS), Bhubaneswar',
    city: 'Bhubaneswar',
    state: 'Odisha',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'All India Institute of Medical Sciences (AIIMS), Jodhpur',
    city: 'Jodhpur',
    state: 'Rajasthan',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'Jawaharlal Institute of Postgraduate Medical Education and Research (JIPMER)',
    city: 'Puducherry',
    state: 'Puducherry',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'Armed Forces Medical College (AFMC)',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'Seth GS Medical College and KEM Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'Madras Medical College',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    college_type: 'Government',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  {
    name: 'Christian Medical College (CMC)',
    city: 'Vellore',
    state: 'Tamil Nadu',
    country: 'India',
    college_type: 'Private',
    course: 'MBBS',
    source: 'scraper:MCC',
  },
  
  // AACCC Colleges (AYUSH)
  {
    name: 'National Institute of Ayurveda',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    college_type: 'Government',
    course: 'BAMS',
    source: 'scraper:AACCC',
  },
  {
    name: 'Faculty of Ayurveda, Institute of Medical Sciences, BHU',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    country: 'India',
    college_type: 'Government',
    course: 'BAMS',
    source: 'scraper:AACCC',
  },
  {
    name: 'National Institute of Homoeopathy',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    college_type: 'Government',
    course: 'BHMS',
    source: 'scraper:AACCC',
  },
  {
    name: 'Government Ayurvedic College',
    city: 'Thiruvananthapuram',
    state: 'Kerala',
    country: 'India',
    college_type: 'Government',
    course: 'BAMS',
    source: 'scraper:AACCC',
  },
  {
    name: 'Gujarat Ayurved University',
    city: 'Jamnagar',
    state: 'Gujarat',
    country: 'India',
    college_type: 'Government',
    course: 'BAMS',
    source: 'scraper:AACCC',
  },
  {
    name: 'Nehru Homoeopathic Medical College and Hospital',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    college_type: 'Government',
    course: 'BHMS',
    source: 'scraper:AACCC',
  },
  {
    name: 'National Institute of Unani Medicine',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    college_type: 'Government',
    course: 'BUMS',
    source: 'scraper:AACCC',
  },
];

async function seedColleges() {
  log.info('Starting historical college seeding...');
  const db = getAdminClient();

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const college of HISTORICAL_COLLEGES) {
    try {
      // Check if college already exists
      const { data: existing, error: findError } = await db
        .from('colleges')
        .select('id')
        .eq('name', college.name)
        .maybeSingle();

      if (findError) throw findError;

      if (!existing) {
        // Insert new college
        const { error: insertError } = await db
          .from('colleges')
          .insert(college);

        if (insertError) throw insertError;
        log.info({ name: college.name }, 'Created college');
        created++;
      } else {
        log.info({ name: college.name }, 'Skipped (already exists)');
        skipped++;
      }
    } catch (err: any) {
      log.error({ name: college.name, err: err.message }, 'Failed to process college');
      errors++;
    }
  }

  log.info({ created, skipped, errors }, 'Historical college seeding completed.');
}

seedColleges().catch(err => {
  log.error({ err }, 'Seed script crashed');
  process.exit(1);
});
