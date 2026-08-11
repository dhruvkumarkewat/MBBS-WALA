-- ============================================================================
-- 012_fix_dental_ayush_course_classification.sql
-- Corrects course field for Dental, AYUSH, and Nursing colleges in database
-- ============================================================================

-- 1. Reclassify Dental institutes to BDS
UPDATE colleges
SET course = 'BDS'
WHERE (name ILIKE '%dental%' OR name ILIKE '%dentistry%' OR name ILIKE '%bds%' OR name ILIKE '%oral%')
  AND (course = 'MBBS' OR course IS NULL);

UPDATE cutoffs
SET course_name = 'BDS'
WHERE (college_name ILIKE '%dental%' OR college_name ILIKE '%dentistry%' OR college_name ILIKE '%bds%' OR college_name ILIKE '%oral%')
  AND (course_name = 'MBBS' OR course_name IS NULL);

-- 2. Reclassify Ayurvedic institutes to BAMS
UPDATE colleges
SET course = 'BAMS'
WHERE (name ILIKE '%ayurved%' OR name ILIKE '%ayurveda%' OR name ILIKE '%bams%')
  AND (course = 'MBBS' OR course IS NULL);

UPDATE cutoffs
SET course_name = 'BAMS'
WHERE (college_name ILIKE '%ayurved%' OR college_name ILIKE '%ayurveda%' OR college_name ILIKE '%bams%')
  AND (course_name = 'MBBS' OR course_name IS NULL);

-- 3. Reclassify Homeopathic institutes to BHMS
UPDATE colleges
SET course = 'BHMS'
WHERE (name ILIKE '%homeopath%' OR name ILIKE '%homeopathy%' OR name ILIKE '%homoeopath%' OR name ILIKE '%homoeopathy%' OR name ILIKE '%bhms%')
  AND (course = 'MBBS' OR course IS NULL);

UPDATE cutoffs
SET course_name = 'BHMS'
WHERE (college_name ILIKE '%homeopath%' OR college_name ILIKE '%homeopathy%' OR college_name ILIKE '%homoeopath%' OR college_name ILIKE '%homoeopathy%' OR college_name ILIKE '%bhms%')
  AND (course_name = 'MBBS' OR course_name IS NULL);

-- 4. Reclassify Unani institutes to BUMS
UPDATE colleges
SET course = 'BUMS'
WHERE (name ILIKE '%unani%' OR name ILIKE '%tibbiya%' OR name ILIKE '%bums%')
  AND (course = 'MBBS' OR course IS NULL);

UPDATE cutoffs
SET course_name = 'BUMS'
WHERE (college_name ILIKE '%unani%' OR college_name ILIKE '%tibbiya%' OR college_name ILIKE '%bums%')
  AND (course_name = 'MBBS' OR course_name IS NULL);

-- 5. Reclassify Nursing institutes
UPDATE colleges
SET course = 'B.Sc Nursing'
WHERE (name ILIKE '%nursing%' OR name ILIKE '% con,%' OR name ILIKE '% con %')
  AND (course = 'MBBS' OR course IS NULL);

UPDATE cutoffs
SET course_name = 'B.Sc Nursing'
WHERE (college_name ILIKE '%nursing%' OR college_name ILIKE '% con,%' OR college_name ILIKE '% con %')
  AND (course_name = 'MBBS' OR course_name IS NULL);
