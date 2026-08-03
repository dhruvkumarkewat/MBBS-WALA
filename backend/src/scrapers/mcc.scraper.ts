import * as cheerio from 'cheerio';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import {
  BaseScraper,
  DetectedItem,
  UpdateCheckResult,
  ExtractedData,
} from './base.scraper.js';
import { createChildLogger } from '../utils/logger.js';
import { env } from '../config/env.js';

const log = createChildLogger('mcc-scraper');

/**
 * MCC (Medical Counselling Committee) Scraper
 * Official source: https://mcc.nic.in
 *
 * Scrapes:
 * - Counselling notices (new bulletins, schedule changes)
 * - Seat matrix PDFs
 * - Round result PDFs (cutoff lists)
 * - Round activation status
 * - Registration/choice-filling windows
 */
export class MCCScraper extends BaseScraper {
  private readonly NOTICE_PAGES = [
    '/',
    '/ug-medical-counselling/',
    '/pg-medical-counselling/',
    '/super-speciality-counselling/',
  ];

  // Keywords that indicate specific notice types
  private readonly KEYWORDS = {
    seat_matrix: ['seat matrix', 'seat-matrix', 'seatmatrix'],
    result: ['seat allotment', 'allotment result', 'round result', 'provisional result'],
    registration: ['registration', 'fresh registration'],
    choice_filling: ['choice filling', 'choice locking', 'preference filling'],
    schedule: ['schedule', 'revised schedule', 'important dates', 'timeline'],
    reporting: ['reporting', 'joining', 'document verification'],
    resignation: ['resignation', 'willingness'],
    vacancy: ['stray vacancy', 'mop up', 'mop-up', 'special stray'],
    fee: ['fee structure', 'fees', 'fee notice'],
    eligibility: ['eligibility', 'eligible candidates'],
    round: ['round 1', 'round 2', 'round 3', 'round-1', 'round-2', 'round-3'],
  };

  constructor() {
    super('MCC', env.MCC_BASE_URL);
  }

  /**
   * Check MCC website for new notices.
   * Uses Cheerio to parse the notice listing pages.
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const newItems: DetectedItem[] = [];
    let pagesChecked = 0;

    for (const pagePath of this.NOTICE_PAGES) {
      try {
        const url = `${this.baseUrl}${pagePath}`;
        log.info({ url }, 'Checking MCC page');

        const response = await axios.get(url, {
          headers: {
            'User-Agent': env.SCRAPER_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: 30000,
        });

        pagesChecked++;

        const $ = cheerio.load(response.data);

        // Parse notice links — MCC typically lists notices in table rows or list items
        $('a[href]').each((_, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          const text = $el.text().trim();

          if (!text || text.length < 5) return;

          // Check if this is a notice/document link
          const isPdf = href.toLowerCase().endsWith('.pdf');
          const isExcel =
            href.toLowerCase().endsWith('.xlsx') || href.toLowerCase().endsWith('.xls');
          const isNoticeLink = isPdf || isExcel || href.includes('Notice') || href.includes('notice');

          if (!isNoticeLink) return;

          const fileUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          const noticeType = this.classifyNotice(text);

          newItems.push({
            title: text,
            description: text,
            noticeType,
            fileUrl,
            fileType: isPdf ? 'pdf' : isExcel ? 'excel' : 'html',
            pageUrl: url,
            priority: this.getPriority(noticeType),
          });
        });
      } catch (err: any) {
        log.error({ err, page: pagePath }, 'Failed to check MCC page');
      }
    }

    // Deduplicate by title
    const seen = new Set<string>();
    const unique = newItems.filter((item) => {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter out already-recorded notices (safe — won't crash if table missing)
    const filtered: DetectedItem[] = [];
    for (const item of unique) {
      try {
        const { data: existing } = await this.db
          .from('counselling_notices')
          .select('id')
          .eq('title', item.title)
          .maybeSingle();

        if (!existing) {
          filtered.push(item);
        }
      } catch {
        // Table may not exist yet — treat all items as new
        filtered.push(item);
      }
    }

    return { pagesChecked, newItems: filtered };
  }

  /**
   * Download a file from MCC.
   */
  async downloadFile(url: string, fileType: string): Promise<string> {
    const downloadDir = path.resolve(env.SCRAPER_DOWNLOAD_DIR, 'mcc');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const fileName = `mcc_${Date.now()}.${fileType === 'excel' ? 'xlsx' : fileType}`;
    const filePath = path.join(downloadDir, fileName);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': env.SCRAPER_USER_AGENT },
      timeout: 60000,
    });

    fs.writeFileSync(filePath, response.data);
    log.info({ filePath, size: response.data.length }, 'File downloaded');

    return filePath;
  }

  /**
   * Extract data from a downloaded file.
   * For PDFs: use pdf-parse to extract text, then parse tables.
   * For Excel: use xlsx to parse sheets.
   */
  async extractData(filePath: string, fileType: string): Promise<ExtractedData> {
    if (fileType === 'pdf') {
      return this.extractFromPdf(filePath);
    } else if (fileType === 'excel') {
      return this.extractFromExcel(filePath);
    }
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  /**
   * Extract cutoff data from a PDF.
   * MCC PDFs typically have tables with: Institute, Course, Category, Quota, Opening Rank, Closing Rank
   */
  private async extractFromPdf(filePath: string): Promise<ExtractedData> {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(filePath);
    const pdf = await pdfParse(buffer);

    const lines = pdf.text.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const records: Record<string, any>[] = [];

    // Parse tabular data from PDF text
    // MCC result PDFs follow a pattern: Institute | Program | Category | Quota | Opening | Closing
    for (const line of lines) {
      const parts = line.split(/\s{2,}|\t/); // Split on multiple spaces or tabs
      if (parts.length < 4) continue;

      // Try to identify rank-like numbers
      const numbers = parts
        .map((p: string) => p.replace(/,/g, ''))
        .filter((p: string) => /^\d+$/.test(p))
        .map(Number);

      if (numbers.length >= 2) {
        // Assume last two numbers are opening and closing ranks
        const openingRank = numbers[numbers.length - 2];
        const closingRank = numbers[numbers.length - 1];

        if (openingRank > 0 && closingRank > 0 && closingRank <= 1500000) {
          // First non-numeric part is likely the college name
          const textParts = parts.filter((p: string) => !/^\d/.test(p.replace(/,/g, '')));

          records.push({
            college_name: textParts[0] || 'Unknown',
            course_name: textParts[1] || 'MBBS',
            category_code: this.detectCategory(line),
            quota_code: this.detectQuota(line),
            opening_rank: openingRank,
            closing_rank: closingRank,
            year: new Date().getFullYear(),
            round_name: this.detectRound(filePath),
            body_code: 'MCC',
          });
        }
      }
    }

    log.info({ filePath, recordCount: records.length }, 'PDF extraction complete');

    return {
      targetTable: 'cutoffs',
      matchKeys: ['college_name', 'category', 'year'],
      records,
    };
  }

  /**
   * Extract data from an Excel file.
   */
  private async extractFromExcel(filePath: string): Promise<ExtractedData> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.readFile(filePath);
    const records: Record<string, any>[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

      for (const row of rows as Record<string, any>[]) {
        // Try to map common column names
        const record: Record<string, any> = {};

        for (const [key, value] of Object.entries(row)) {
          const lk = key.toLowerCase().replace(/[^a-z0-9]/g, '');

          if (lk.includes('institute') || lk.includes('college') || lk.includes('name')) {
            record.college_name = value;
          } else if (lk.includes('opening') && lk.includes('rank')) {
            record.opening_rank = typeof value === 'number' ? value : parseInt(String(value));
          } else if (lk.includes('closing') && lk.includes('rank')) {
            record.closing_rank = typeof value === 'number' ? value : parseInt(String(value));
          } else if (lk.includes('category')) {
            record.category_code = value;
          } else if (lk.includes('quota')) {
            record.quota_code = value;
          } else if (lk.includes('course') || lk.includes('program')) {
            record.course_name = value;
          } else if (lk.includes('seat') || lk.includes('intake')) {
            record.total_seats = typeof value === 'number' ? value : parseInt(String(value));
          } else if (lk.includes('state')) {
            record.state = value;
          }
        }

        if (record.college_name && (record.closing_rank || record.total_seats)) {
          record.year = record.year || new Date().getFullYear();
          record.body_code = 'MCC';
          records.push(record);
        }
      }
    }

    log.info({ filePath, recordCount: records.length }, 'Excel extraction complete');

    const isSeatMatrix = records.some((r) => r.total_seats != null);
    return {
      targetTable: isSeatMatrix ? 'seat_matrix' : 'cutoffs',
      matchKeys: isSeatMatrix
        ? ['college_name', 'year']
        : ['college_name', 'category_code', 'year'],
      records,
    };
  }

  /**
   * Extract from HTML tables (inline data on MCC pages).
   */
  async extractFromHtml(html: string): Promise<ExtractedData> {
    const $ = cheerio.load(html);
    const records: Record<string, any>[] = [];

    // Find all tables
    $('table').each((_, table) => {
      const headers: string[] = [];
      $(table)
        .find('thead th, tr:first-child th, tr:first-child td')
        .each((_, th) => {
          headers.push($(th).text().trim().toLowerCase());
        });

      $(table)
        .find('tbody tr, tr:not(:first-child)')
        .each((_, tr) => {
          const cells: string[] = [];
          $(tr)
            .find('td')
            .each((_, td) => {
              cells.push($(td).text().trim());
            });

          if (cells.length >= 3 && headers.length >= 3) {
            const record: Record<string, any> = {};
            headers.forEach((h, i) => {
              if (i < cells.length) record[h] = cells[i];
            });
            records.push(record);
          }
        });
    });

    return {
      targetTable: 'cutoffs',
      matchKeys: ['college_name', 'category', 'year'],
      records,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private classifyNotice(text: string): string {
    const lower = text.toLowerCase();
    for (const [type, keywords] of Object.entries(this.KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) return type;
    }
    return 'general';
  }

  private getPriority(noticeType: string): string {
    const urgentTypes = ['result', 'registration', 'choice_filling', 'seat_matrix'];
    if (urgentTypes.includes(noticeType)) return 'urgent';
    if (noticeType === 'schedule') return 'high';
    return 'normal';
  }

  private detectCategory(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('obc')) return 'OBC';
    if (lower.includes('ews')) return 'EWS';
    if (lower.includes('sc') && !lower.includes('score')) return 'SC';
    if (lower.includes('st') && !lower.includes('state')) return 'ST';
    return 'General';
  }

  private detectQuota(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('all india') || lower.includes('aiq')) return 'AI';
    if (lower.includes('state')) return 'HS';
    if (lower.includes('management')) return 'MQ';
    if (lower.includes('nri')) return 'NRI';
    return 'AI';
  }

  private detectRound(source: string): string {
    const lower = source.toLowerCase();
    if (lower.includes('round-3') || lower.includes('round_3') || lower.includes('round3')) return 'Round 3';
    if (lower.includes('round-2') || lower.includes('round_2') || lower.includes('round2')) return 'Round 2';
    if (lower.includes('mop') || lower.includes('mop_up')) return 'Mop Up';
    if (lower.includes('stray')) return 'Stray Vacancy';
    return 'Round 1';
  }
}
