-- ============================================================================
-- 010_colleges_identity_fix.sql
-- Fixes missing default primary key sequences on colleges, cutoffs, and seat_matrix
-- ============================================================================

-- Colleges table primary key sequence
CREATE SEQUENCE IF NOT EXISTS colleges_id_seq;
ALTER TABLE IF EXISTS colleges ALTER COLUMN id SET DEFAULT nextval('colleges_id_seq');
SELECT setval('colleges_id_seq', COALESCE((SELECT MAX(id) FROM colleges), 0) + 1);

-- Cutoffs table primary key sequence
CREATE SEQUENCE IF NOT EXISTS cutoffs_id_seq;
ALTER TABLE IF EXISTS cutoffs ALTER COLUMN id SET DEFAULT nextval('cutoffs_id_seq');
SELECT setval('cutoffs_id_seq', COALESCE((SELECT MAX(id) FROM cutoffs), 0) + 1);

-- Seat matrix primary key sequence
CREATE SEQUENCE IF NOT EXISTS seat_matrix_id_seq;
ALTER TABLE IF EXISTS seat_matrix ALTER COLUMN id SET DEFAULT nextval('seat_matrix_id_seq');
SELECT setval('seat_matrix_id_seq', COALESCE((SELECT MAX(id) FROM seat_matrix), 0) + 1);
