import axios from 'axios';
import { getAdminClient } from '../config/database.js';
import { env } from '../config/env.js';
import { createChildLogger } from '../utils/logger.js';
import { generateChecksum, hasChanged } from '../utils/checksum.js';

const log = createChildLogger('base-scraper');

/**
 * Base scraper class for the ETL pipeline.
 * Writes to EXISTING Supabase tables: colleges, cutoffs, seat_matrix.
 *
 * Pipeline: Check → Download → Extract → Validate → Compare → Upsert
 */
export abstract class BaseScraper {
  protected bodyCode: string;
  protected baseUrl: string;
  protected db = getAdminClient();

  constructor(bodyCode: string, baseUrl: string) {
    this.bodyCode = bodyCode;
    this.baseUrl = baseUrl;
  }

  /**
   * Main entry — runs the full ETL cycle.
   */
  async run(isDryRun = false): Promise<ScraperRunResult> {
    const runId = crypto.randomUUID();
    const startTime = Date.now();
    const result: ScraperRunResult = {
      runId,
      bodyCode: this.bodyCode,
      pagesChecked: 0,
      newNotices: 0,
      filesDownloaded: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
    };

    try {
      log.info({ bodyCode: this.bodyCode, isDryRun }, 'Starting scraper run');

      // Record run in DB (safe — uses upsert pattern, ignores if table missing)
      await this.safeInsert('scraper_runs', {
        body_code: this.bodyCode,
        run_type: 'notice_check',
        status: 'running',
        started_at: new Date().toISOString(),
      });

      // Step 1: Check for updates on the website
      const updates = await this.checkForUpdates();
      result.pagesChecked = updates.pagesChecked;

      if (updates.newItems.length === 0) {
        log.info({ bodyCode: this.bodyCode }, 'No new updates detected');
        await this.finishRun(result, startTime);
        return result;
      }

      log.info(
        { bodyCode: this.bodyCode, newItems: updates.newItems.length },
        'New updates detected'
      );

      // Step 2: Process each new item with Smart Change Detection
      for (const item of updates.newItems) {
        try {
          let content: ExtractedData | null = null;

          if (item.fileUrl) {
            if (!isDryRun) {
              // Pre-flight HTTP HEAD check for smart caching
              const headInfo = await this.checkHttpHead(item.fileUrl);
              log.debug({ fileUrl: item.fileUrl, headInfo }, 'Pre-flight HEAD check');

              const filePath = await this.downloadFile(item.fileUrl, item.fileType);
              result.filesDownloaded++;

              // Verify SHA-256 checksum
              const checksum = generateChecksum(filePath);
              const { data: previousNotice } = await this.db
                .from('counselling_notices')
                .select('id, description')
                .eq('pdf_url', item.fileUrl)
                .maybeSingle();

              if (previousNotice && previousNotice.description?.includes(checksum)) {
                log.info({ file: filePath }, 'File content unchanged (checksum match) — skipping extraction');
                result.recordsSkipped++;
                continue;
              }

              content = await this.extractData(filePath, item.fileType);
            }
          } else if (item.htmlContent) {
            content = await this.extractFromHtml(item.htmlContent);
          }

          if (!content || !content.records.length) {
            result.recordsSkipped++;
            continue;
          }

          // Validate
          const validationResult = this.validateData(content);
          if (!validationResult.isValid) {
            log.warn({ item: item.title, errors: validationResult.errors }, 'Validation failed');
            result.errors.push({ item: item.title, error: `Validation: ${validationResult.errors.join(', ')}` });
            continue;
          }

          // Upsert to DB
          if (!isDryRun) {
            const upsertResult = await this.upsertToExistingTables(content);
            result.recordsCreated += upsertResult.created;
            result.recordsUpdated += upsertResult.updated;
            result.recordsSkipped += upsertResult.skipped;
          }

          // Record notice (safe)
          if (!isDryRun) {
            await this.safeRecordNotice(item);
            result.newNotices++;
          }
        } catch (err: any) {
          log.error({ err, item: item.title }, 'Error processing item');
          result.errors.push({ item: item.title, error: err.message });
        }
      }

      await this.finishRun(result, startTime);
      log.info({ bodyCode: this.bodyCode, result }, 'Scraper run complete');
    } catch (err: any) {
      log.error({ err, bodyCode: this.bodyCode }, 'Scraper run failed');
      result.errors.push({ item: 'run', error: err.message });
    }

    return result;
  }

  /**
   * Pre-flight HTTP HEAD check to inspect headers before downloading.
   */
  protected async checkHttpHead(url: string): Promise<{ etag?: string; lastModified?: string; contentLength?: number }> {
    try {
      const res = await axios.head(url, {
        headers: { 'User-Agent': env.SCRAPER_USER_AGENT },
        timeout: 10000,
      });
      return {
        etag: res.headers['etag'] as string | undefined,
        lastModified: res.headers['last-modified'] as string | undefined,
        contentLength: res.headers['content-length'] ? Number(res.headers['content-length']) : undefined,
      };
    } catch {
      return {};
    }
  }

  // ── Abstract methods ────────────────────────────────────────────────────
  abstract checkForUpdates(): Promise<UpdateCheckResult>;
  abstract downloadFile(url: string, fileType: string): Promise<string>;
  abstract extractData(filePath: string, fileType: string): Promise<ExtractedData>;
  abstract extractFromHtml(html: string): Promise<ExtractedData>;

  // ── Upsert to EXISTING tables ───────────────────────────────────────────

  /**
   * Write data to the EXISTING Supabase tables.
   * Maps extracted records to the actual column schema:
   *
   * cutoffs: id, college_name, state, category, aiq_rank, aiq_score,
   *          state_rank_range, state_score_range, year, source
   *
   * seat_matrix: id, college_name, state, college_kind, total_seats,
   *              all_india, goi, remaining_seats, pwd, sainik, ff, gs,
   *              open_seats, nri_seats, year, source
   *
   * colleges: id, name, city, state, country, college_type, course, source
   */
  async upsertToExistingTables(data: ExtractedData): Promise<UpsertResult> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Track college names we've already tried to upsert this run (avoid duplicates)
    const seenColleges = new Set<string>();

    for (const record of data.records) {
      try {
        if (data.targetTable === 'cutoffs') {
          const mapped = this.mapToCutoffSchema(record);
          const result = await this.upsertCutoff(mapped);
          if (result === 'created') created++;
          else if (result === 'updated') updated++;
          // Auto-create college entry from cutoff data
          const collegeName = (mapped.college_name || record.college_name || record.name || '').trim();
          if (this.isLikelyCollegeName(collegeName) && !seenColleges.has(collegeName)) {
            seenColleges.add(collegeName);
            const collegeRecord = this.mapToCollegeSchema({
              name: collegeName,
              state: mapped.state || record.state,
              college_type: record.college_type || record.college_kind,
              course: record.course_name || record.course,
            });
            await this.upsertCollege(collegeRecord);
          }
        } else if (data.targetTable === 'seat_matrix') {
          const mapped = this.mapToSeatMatrixSchema(record);
          const result = await this.upsertSeatMatrix(mapped);
          if (result === 'created') created++;
          else if (result === 'updated') updated++;
          else skipped++;

          // Auto-create college entry from seat matrix data
          const collegeName = (mapped.college_name || record.college_name || record.name || '').trim();
          if (this.isLikelyCollegeName(collegeName) && !seenColleges.has(collegeName)) {
            seenColleges.add(collegeName);
            const collegeRecord = this.mapToCollegeSchema({
              name: collegeName,
              state: mapped.state || record.state,
              college_type: record.college_type || mapped.college_kind,
              course: record.course_name || record.course,
            });
            await this.upsertCollege(collegeRecord);
          }
        } else if (data.targetTable === 'colleges') {
          const mapped = this.mapToCollegeSchema(record);
          if (this.isLikelyCollegeName(mapped.name)) {
            const result = await this.upsertCollege(mapped);
            if (result === 'created') created++;
            else if (result === 'updated') updated++;
            else skipped++;
          } else {
            skipped++;
          }
        }
      } catch (err: any) {
        log.warn({ err, record: record.college_name || record.name }, 'Upsert error — skipping');
        skipped++;
      }
    }

    log.info({ seenColleges: seenColleges.size }, 'Auto-created college entries from scraped data');
    return { created, updated, skipped };
  }

  /**
   * Map extracted record to the cutoffs table schema.
   */
  private mapToCutoffSchema(record: Record<string, any>): Record<string, any> {
    const yr = record.year || new Date().getFullYear();
    const nextYrShort = String((yr + 1) % 100).padStart(2, '0');
    return {
      college_name: record.college_name || record.institute_name || record.name || '',
      academic_year: record.academic_year || `${yr}-${nextYrShort}`,
      round_name: record.round_name || 'Final',
      state: record.state || null,
      category: record.category || record.category_code || 'General',
      aiq_rank: record.closing_rank || record.aiq_rank || null,
      aiq_score: record.closing_score || record.aiq_score || null,
      state_rank_range: record.state_rank_range || null,
      state_score_range: record.state_score_range || null,
      year: yr,
      course_name: record.course_name || record.course || 'MBBS',
      source: `scraper:${this.bodyCode}`,
    };
  }

  /**
   * Map extracted record to the seat_matrix table schema.
   */
  private mapToSeatMatrixSchema(record: Record<string, any>): Record<string, any> {
    return {
      college_name: record.college_name || record.institute_name || '',
      state: record.state || null,
      college_kind: record.college_kind || record.college_type || null,
      total_seats: record.total_seats || 0,
      all_india: record.all_india || record.ai_seats || null,
      goi: record.goi || null,
      remaining_seats: record.remaining_seats || null,
      pwd: record.pwd || null,
      sainik: record.sainik || null,
      ff: record.ff || null,
      gs: record.gs || null,
      open_seats: record.open_seats || record.vacant_seats || null,
      nri_seats: record.nri_seats || null,
      year: record.year || new Date().getFullYear(),
      source: `scraper:${this.bodyCode}`,
    };
  }

  /**
   * Validate that a candidate string is genuinely a medical college/institution name.
   */
  protected isLikelyCollegeName(name: string): boolean {
    if (!name || name.trim().length < 8) return false;
    const lower = name.toLowerCase().trim();

    // Reject obvious document phrases, applicant rules, and checklists
    const invalidPhrases = [
      'passport', 'candidate', 'certificate', 'undertaking', 'affidavit', 'eligibility',
      'annexure', 'proforma', 'allotment letter', 'instruction', 'admit card', 'score card',
      'domicile', 'caste', 'signature', 'thumb', 'photograph', 'stipend', 'bond', 'penalty',
      'verification', 'reporting', 'counselling schedule', 'registration', 'payment', 'fee structure',
      'valid id', 'original document', 'category certificate', 'seat allotment', 'result of',
      'notice regarding', 'information bulletin', 'stray vacancy', 'mop up', 'round 1', 'round 2',
      'applicable to', 'submission of', 'declaration', 'authority', 'directorate'
    ];
    if (invalidPhrases.some((phrase) => lower.includes(phrase))) return false;

    // Accept if contains college/medical institution indicators
    const medicalKeywords = [
      'medical', 'college', 'hospital', 'institute', 'aiims', 'university', 'faculty',
      'academy', 'vidyapeeth', 'ayurved', 'dental', 'homoeo', 'unani', 'siddha', 'nursing',
      'gmc', 'rims', 'ims', 'vmmc', 'ucms', 'kgmu', 'pgims', 'mamc', 'bhumc', 'esic'
    ];
    return medicalKeywords.some((kw) => lower.includes(kw));
  }

  /**
   * Map extracted record to the colleges table schema.
   */
  private mapToCollegeSchema(record: Record<string, any>): Record<string, any> {
    const name = (record.name || record.college_name || record.institute_name || '').trim();
    const colType = record.type || record.college_type || 'Government';
    return {
      name,
      short_name: record.short_name || record.short || name.slice(0, 12),
      city: record.city || 'Unknown',
      state: record.state || 'Unknown',
      country: record.country || 'INDIA',
      college_type: colType,
      course: record.course || record.course_name || 'MBBS',
      source: `scraper:${this.bodyCode}`,
      is_active: true,
    };
  }

  /**
   * Upsert a cutoff record. Matches on college_name + category + year.
   */
  private async upsertCutoff(record: Record<string, any>): Promise<'created' | 'updated' | 'skipped'> {
    if (!record.college_name || !record.aiq_rank) return 'skipped';

    // Check if exists
    const { data: existing } = await this.db
      .from('cutoffs')
      .select('id, aiq_rank')
      .eq('college_name', record.college_name)
      .eq('category', record.category)
      .eq('year', record.year)
      .maybeSingle();

    if (existing) {
      // Only update if rank actually changed
      if (existing.aiq_rank !== record.aiq_rank) {
        await this.db.from('cutoffs').update(record).eq('id', existing.id);
        return 'updated';
      }
      return 'skipped';
    }

    // Insert new
    const { error } = await this.db.from('cutoffs').insert(record);
    if (error) {
      log.warn({ error, college: record.college_name }, 'Cutoff insert failed');
      return 'skipped';
    }
    return 'created';
  }

  /**
   * Upsert a seat_matrix record. Matches on college_name + year.
   */
  private async upsertSeatMatrix(record: Record<string, any>): Promise<'created' | 'updated' | 'skipped'> {
    if (!record.college_name) return 'skipped';

    const { data: existing } = await this.db
      .from('seat_matrix')
      .select('id, total_seats')
      .eq('college_name', record.college_name)
      .eq('year', record.year)
      .maybeSingle();

    if (existing) {
      if (existing.total_seats !== record.total_seats) {
        await this.db.from('seat_matrix').update(record).eq('id', existing.id);
        return 'updated';
      }
      return 'skipped';
    }

    const { error } = await this.db.from('seat_matrix').insert(record);
    if (error) {
      log.warn({ error, college: record.college_name }, 'Seat matrix insert failed');
      return 'skipped';
    }
    return 'created';
  }

  /**
   * Upsert a college record. Matches on name + course.
   */
  private async upsertCollege(record: Record<string, any>): Promise<'created' | 'updated' | 'skipped'> {
    if (!record.name) return 'skipped';

    const { data: existing } = await this.db
      .from('colleges')
      .select('id')
      .eq('name', record.name)
      .maybeSingle();

    if (existing) return 'skipped'; // Don't overwrite existing college data

    const { error } = await this.db.from('colleges').insert(record);
    if (error) {
      log.warn({ error, college: record.name }, 'College insert failed');
      return 'skipped';
    }
    return 'created';
  }

  // ── Safe helpers (no-crash on missing tables) ───────────────────────────

  /**
   * Safe insert — catches errors if table doesn't exist.
   */
  protected async safeInsert(table: string, data: Record<string, any>): Promise<boolean> {
    try {
      const { error } = await this.db.from(table).insert(data);
      if (error) {
        log.debug({ table, error: error.message }, 'Safe insert failed (table may not exist)');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve counselling body UUID from code (auto-creating if missing).
   */
  protected async getBodyUuid(): Promise<string | null> {
    try {
      const { data: body } = await this.db
        .from('counselling_bodies')
        .select('id')
        .eq('code', this.bodyCode)
        .maybeSingle();

      if (body?.id) return body.id;

      const { data: created } = await this.db
        .from('counselling_bodies')
        .insert({
          code: this.bodyCode,
          name: this.bodyCode,
          full_name: this.bodyCode,
          type: this.bodyCode === 'MCC' ? 'Central' : this.bodyCode === 'AACCC' ? 'AYUSH' : 'State',
          is_active: true,
          source: 'scraper',
        })
        .select('id')
        .maybeSingle();

      return created?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Record a notice (safe — won't crash if counselling_notices table missing).
   */
  protected async safeRecordNotice(item: DetectedItem): Promise<void> {
    const bodyUuid = await this.getBodyUuid();
    if (bodyUuid) {
      await this.safeInsert('counselling_notices', {
        body_id: bodyUuid,
        title: item.title,
        description: item.description,
        notice_type: item.noticeType,
        notice_date: item.date || new Date().toISOString().split('T')[0],
        pdf_url: item.fileUrl,
        page_url: item.pageUrl,
        priority: item.priority || 'normal',
        source: 'scraper',
      });
    }

    // Also record to notifications table for real-time notification feed
    await this.safeInsert('notifications', {
      title: `[${this.bodyCode}] ${item.title}`,
      body: item.description || item.title,
      read: false,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Update run record on completion.
   */
  private async finishRun(result: ScraperRunResult, startTime: number): Promise<void> {
    await this.safeInsert('scraper_runs', {
      body_code: this.bodyCode,
      run_type: 'notice_check',
      status: result.errors.length > 0 ? 'completed_with_errors' : 'completed',
      pages_checked: result.pagesChecked,
      new_notices: result.newNotices,
      files_downloaded: result.filesDownloaded,
      records_created: result.recordsCreated,
      records_updated: result.recordsUpdated,
      records_skipped: result.recordsSkipped,
      duration_ms: Date.now() - startTime,
      completed_at: new Date().toISOString(),
    });
  }

  // ── Validation ──────────────────────────────────────────────────────────

  validateData(data: ExtractedData): ValidationResult {
    const errors: string[] = [];

    if (!data.records || data.records.length === 0) {
      errors.push('No records extracted');
    }

    for (const record of data.records || []) {
      if (!record.college_name && !record.name && !record.institute_name) {
        errors.push('Missing college name');
      }
      if (record.closing_rank != null && (record.closing_rank < 1 || record.closing_rank > 1500000)) {
        errors.push(`Invalid rank: ${record.closing_rank}`);
      }
      if (record.aiq_rank != null && (record.aiq_rank < 1 || record.aiq_rank > 1500000)) {
        errors.push(`Invalid aiq_rank: ${record.aiq_rank}`);
      }
      if (record.closing_score != null && (record.closing_score < 0 || record.closing_score > 720)) {
        errors.push(`Invalid score: ${record.closing_score}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DetectedItem {
  title: string;
  description?: string;
  noticeType: string;
  date?: string;
  fileUrl?: string;
  fileType: string;
  pageUrl: string;
  htmlContent?: string;
  priority?: string;
}

export interface UpdateCheckResult {
  pagesChecked: number;
  newItems: DetectedItem[];
}

export interface ExtractedData {
  targetTable: string;         // 'cutoffs', 'seat_matrix', 'colleges'
  matchKeys: string[];
  records: Record<string, any>[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UpsertResult {
  created: number;
  updated: number;
  skipped: number;
}

export interface ScraperRunResult {
  runId: string;
  bodyCode: string;
  pagesChecked: number;
  newNotices: number;
  filesDownloaded: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: { item: string; error: string }[];
}
