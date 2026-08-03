import { z } from 'zod';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('validation');

// ── Cutoff Record Validation ──────────────────────────────────────────────────
export const cutoffRecordSchema = z.object({
  college_name: z.string().min(2, 'College name must be at least 2 characters'),
  course_name: z.enum(['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS']).optional().default('MBBS'),
  category_code: z.string().min(1),
  quota_code: z.string().optional().default('AIQ'),
  year: z.number().int().min(2015).max(2035),
  round_name: z.string().optional(),
  opening_rank: z.number().int().min(1).max(2500000).optional().nullable(),
  closing_rank: z.number().int().min(1).max(2500000).optional().nullable(),
  opening_score: z.number().min(0).max(720).optional().nullable(),
  closing_score: z.number().min(0).max(720).optional().nullable(),
  body_code: z.string().optional(),
}).refine(
  (data) => data.closing_rank != null || data.closing_score != null || data.opening_rank != null,
  { message: 'Either closing_rank, opening_rank, or score must be provided' }
);

// ── Seat Matrix Record Validation ─────────────────────────────────────────────
export const seatMatrixRecordSchema = z.object({
  college_name: z.string().min(2),
  course_name: z.enum(['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS']).optional().default('MBBS'),
  year: z.number().int().min(2015).max(2035),
  quota_code: z.string().optional().default('AIQ'),
  category_code: z.string().optional().default('General'),
  total_seats: z.number().int().min(0).max(5000),
  filled_seats: z.number().int().min(0).optional(),
  vacant_seats: z.number().int().min(0).optional(),
  body_code: z.string().optional(),
});

// ── College Record Validation ─────────────────────────────────────────────────
export const collegeRecordSchema = z.object({
  name: z.string().min(2),
  state: z.string().min(2),
  city: z.string().optional().nullable(),
  college_type: z.string().optional().default('Government'),
  college_code: z.string().optional().nullable(),
  established: z.number().int().min(1800).max(2035).optional().nullable(),
  website: z.string().optional().nullable(),
});

// ── Notice Record Validation ──────────────────────────────────────────────────
export const noticeRecordSchema = z.object({
  title: z.string().min(3),
  body_code: z.string().optional(),
  notice_type: z.enum([
    'schedule', 'registration', 'choice_filling', 'seat_matrix',
    'result', 'reporting', 'resignation', 'upgrade', 'vacancy',
    'fee', 'eligibility', 'bulletin', 'general', 'correction', 'round'
  ]).optional().default('general'),
  pdf_url: z.string().optional().nullable(),
  notice_date: z.string().optional(),
});

/**
 * Validation Service
 *
 * Every imported record must pass validation before being written to the database.
 * Includes schema validation, range checks, duplicate detection, and cross-referencing.
 */
export class ValidationService {
  /**
   * Validate a batch of cutoff records.
   */
  validateCutoffs(records: Record<string, any>[]): ValidationBatchResult {
    return this.validateBatch(records, cutoffRecordSchema, 'cutoff');
  }

  /**
   * Validate a batch of seat matrix records.
   */
  validateSeatMatrix(records: Record<string, any>[]): ValidationBatchResult {
    return this.validateBatch(records, seatMatrixRecordSchema, 'seat_matrix');
  }

  /**
   * Validate a batch of college records.
   */
  validateColleges(records: Record<string, any>[]): ValidationBatchResult {
    return this.validateBatch(records, collegeRecordSchema, 'college');
  }

  /**
   * Run a batch through a Zod schema, returning valid and invalid records.
   */
  private validateBatch(
    records: Record<string, any>[],
    schema: z.ZodSchema,
    type: string
  ): ValidationBatchResult {
    const valid: Record<string, any>[] = [];
    const invalid: InvalidRecord[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Duplicate detection within the batch
      const key = this.deduplicationKey(record, type);
      if (seen.has(key)) {
        invalid.push({
          index: i,
          record,
          errors: ['Duplicate record within batch'],
        });
        continue;
      }
      seen.add(key);

      // Schema validation
      const result = schema.safeParse(record);
      if (result.success) {
        valid.push(result.data);
      } else {
        invalid.push({
          index: i,
          record,
          errors: result.error.issues.map(
            (issue) => `${issue.path.join('.')}: ${issue.message}`
          ),
        });
      }
    }

    // Cross-validation checks
    if (type === 'cutoff') {
      // Check for logical consistency: opening_rank should be <= closing_rank
      for (const record of valid) {
        if (record.opening_rank && record.closing_rank) {
          if (record.opening_rank > record.closing_rank) {
            log.warn(
              { college: record.college_name, opening: record.opening_rank, closing: record.closing_rank },
              'Opening rank > closing rank — data may be swapped'
            );
          }
        }
      }
    }

    const batchResult: ValidationBatchResult = {
      totalRecords: records.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      validRecords: valid,
      invalidRecords: invalid,
      passRate: records.length > 0 ? (valid.length / records.length) * 100 : 0,
    };

    log.info(
      {
        type,
        total: batchResult.totalRecords,
        valid: batchResult.validCount,
        invalid: batchResult.invalidCount,
        passRate: `${batchResult.passRate.toFixed(1)}%`,
      },
      'Validation batch complete'
    );

    return batchResult;
  }

  /**
   * Generate a deduplication key for a record.
   */
  private deduplicationKey(record: Record<string, any>, type: string): string {
    switch (type) {
      case 'cutoff':
        return `${record.college_name}|${record.category_code}|${record.year}|${record.round_name}|${record.quota_code}`.toLowerCase();
      case 'seat_matrix':
        return `${record.college_name}|${record.year}|${record.quota_code}|${record.category_code}`.toLowerCase();
      case 'college':
        return `${record.name}|${record.state}`.toLowerCase();
      default:
        return JSON.stringify(record);
    }
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidationBatchResult {
  totalRecords: number;
  validCount: number;
  invalidCount: number;
  validRecords: Record<string, any>[];
  invalidRecords: InvalidRecord[];
  passRate: number;
}

export interface InvalidRecord {
  index: number;
  record: Record<string, any>;
  errors: string[];
}
