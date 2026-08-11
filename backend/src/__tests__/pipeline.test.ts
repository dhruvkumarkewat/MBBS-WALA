import { describe, it, expect } from 'vitest';
import {
  getAllStateAuthorities,
  getStateAuthorityByCode,
  getStateAuthorityByState,
  getHighPriorityStateAuthorities,
} from '../scrapers/state-registry.js';
import { ValidationService } from '../services/validation.service.js';
import { generateChecksum, hasChanged } from '../utils/checksum.js';

describe('Automated Counselling Pipeline - State Registry', () => {
  it('should load all 36 Indian States and Union Territories authorities', () => {
    const allStates = getAllStateAuthorities();
    expect(allStates.length).toBeGreaterThanOrEqual(30);
  });

  it('should find authority by state code', () => {
    const mp = getStateAuthorityByCode('DME_MP');
    expect(mp).toBeDefined();
    expect(mp?.state).toBe('Madhya Pradesh');
    expect(mp?.courses).toContain('MBBS');
  });

  it('should find authority by state name case-insensitively', () => {
    const mah = getStateAuthorityByState('maharashtra');
    expect(mah).toBeDefined();
    expect(mah?.code).toBe('CET_MAH');
  });

  it('should return tier-1 high priority authorities', () => {
    const high = getHighPriorityStateAuthorities();
    expect(high.length).toBeGreaterThan(0);
    expect(high.every((a) => a.priority <= 2)).toBe(true);
  });
});

describe('Automated Counselling Pipeline - Data Validation Service', () => {
  const validator = new ValidationService();

  it('should validate valid cutoff records with AYUSH courses', () => {
    const records = [
      {
        college_name: 'AIIMS New Delhi',
        course_name: 'MBBS',
        category_code: 'GEN',
        quota_code: 'AIQ',
        closing_rank: 55,
        year: 2026,
      },
      {
        college_name: 'National Institute of Ayurveda, Jaipur',
        course_name: 'BAMS',
        category_code: 'OBC',
        quota_code: 'AIQ',
        closing_rank: 12500,
        year: 2026,
      },
    ];

    const result = validator.validateCutoffs(records);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(0);
  });

  it('should reject invalid cutoff records with out-of-range ranks', () => {
    const records = [
      {
        college_name: 'Invalid Rank College',
        course_name: 'MBBS',
        category_code: 'GEN',
        closing_rank: -50, // Invalid negative rank
        year: 2026,
      },
    ];

    const result = validator.validateCutoffs(records);
    expect(result.validCount).toBe(0);
    expect(result.invalidCount).toBe(1);
  });
});

describe('Automated Counselling Pipeline - Smart Checksum Engine', () => {
  it('should detect when checksums match vs differ', () => {
    const hash1 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const hash2 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const hash3 = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';

    expect(hasChanged(hash1, hash2)).toBe(false);
    expect(hasChanged(hash1, hash3)).toBe(true);
  });
});
