import crypto from 'crypto';

/**
 * Generate a SHA-256 checksum of a record's content.
 * Used to detect changes in scraped data without doing field-by-field comparison.
 */
export function generateChecksum(data: Record<string, unknown>): string {
  // Sort keys for deterministic output
  const sorted = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(sorted).digest('hex');
}

/**
 * Compare two checksums to detect if data has changed.
 */
export function hasChanged(oldChecksum: string | null, newChecksum: string): boolean {
  return oldChecksum !== newChecksum;
}
