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

const log = createChildLogger('aaccc-scraper');

/**
 * AACCC (AYUSH Admissions Central Counseling Committee) Scraper
 * Official source: https://aaccc.gov.in
 *
 * Scrapes AYUSH counselling data: BAMS, BHMS, BUMS, BSMS, BNYS
 */
export class AACCCScraper extends BaseScraper {
  private readonly NOTICE_PAGES = [
    '/',
  ];

  constructor() {
    super('AACCC', env.AACCC_BASE_URL);
  }

  async checkForUpdates(): Promise<UpdateCheckResult> {
    const newItems: DetectedItem[] = [];
    let pagesChecked = 0;

    for (const pagePath of this.NOTICE_PAGES) {
      try {
        const url = `${this.baseUrl}${pagePath}`;
        log.info({ url }, 'Checking AACCC page');

        const response = await axios.get(url, {
          headers: {
            'User-Agent': env.SCRAPER_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: 30000,
        });

        pagesChecked++;
        const $ = cheerio.load(response.data);

        // AACCC typically lists notices with PDF links
        $('a[href*=".pdf"], a[href*="Notice"], a[href*="notice"]').each((_, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          const text = $el.text().trim() || $el.attr('title') || '';

          if (!text || text.length < 5) return;

          const fileUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          const isPdf = href.toLowerCase().endsWith('.pdf');
          const isExcel = href.toLowerCase().includes('.xls');

          newItems.push({
            title: text,
            noticeType: this.classifyNotice(text),
            fileUrl,
            fileType: isPdf ? 'pdf' : isExcel ? 'excel' : 'html',
            pageUrl: url,
            priority: 'normal',
          });
        });
      } catch (err: any) {
        log.error({ err, page: pagePath }, 'Failed to check AACCC page');
      }
    }

    // Deduplicate and filter already-recorded
    const seen = new Set<string>();
    const unique = newItems.filter((item) => {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const filtered: DetectedItem[] = [];
    for (const item of unique) {
      const { data: existing } = await this.db
        .from('counselling_notices')
        .select('id')
        .eq('title', item.title)
        .maybeSingle();

      if (!existing) filtered.push(item);
    }

    return { pagesChecked, newItems: filtered };
  }

  async downloadFile(url: string, fileType: string): Promise<string> {
    const downloadDir = path.resolve(env.SCRAPER_DOWNLOAD_DIR, 'aaccc');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const fileName = `aaccc_${Date.now()}.${fileType === 'excel' ? 'xlsx' : fileType}`;
    const filePath = path.join(downloadDir, fileName);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': env.SCRAPER_USER_AGENT },
      timeout: 60000,
    });

    fs.writeFileSync(filePath, response.data);
    log.info({ filePath, size: response.data.length }, 'AACCC file downloaded');

    return filePath;
  }

  async extractData(filePath: string, fileType: string): Promise<ExtractedData> {
    if (fileType === 'pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = fs.readFileSync(filePath);
      const pdf = await pdfParse(buffer);

      const lines = pdf.text.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const records: Record<string, any>[] = [];

      for (const line of lines) {
        const parts = line.split(/\s{2,}|\t/);
        const numbers = parts
          .map((p: string) => p.replace(/,/g, ''))
          .filter((p: string) => /^\d+$/.test(p))
          .map(Number);

        if (numbers.length >= 2) {
          const openingRank = numbers[numbers.length - 2];
          const closingRank = numbers[numbers.length - 1];

          if (closingRank > 0 && closingRank <= 1500000) {
            const textParts = parts.filter((p: string) => !/^\d/.test(p.replace(/,/g, '')));
            records.push({
              college_name: textParts[0] || 'Unknown',
              course_name: this.detectAyushCourse(line),
              category_code: this.detectCategory(line),
              quota_code: 'AI',
              opening_rank: openingRank,
              closing_rank: closingRank,
              year: new Date().getFullYear(),
              body_code: 'AACCC',
            });
          }
        }
      }

      return {
        targetTable: 'cutoffs',
        matchKeys: ['college_name', 'category_code', 'year'],
        records,
      };
    }

    // Excel fallback
    const XLSX = await import('xlsx');
    const workbook = XLSX.readFile(filePath);
    const records: Record<string, any>[] = [];

    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      for (const row of rows as Record<string, any>[]) {
        if (row.college_name || row.Institute || row.institute_name) {
          records.push({
            college_name: row.college_name || row.Institute || row.institute_name,
            closing_rank: row.closing_rank || row.Closing_Rank,
            opening_rank: row.opening_rank || row.Opening_Rank,
            category_code: row.category || row.Category || 'General',
            year: new Date().getFullYear(),
            body_code: 'AACCC',
          });
        }
      }
    }

    return {
      targetTable: 'cutoffs',
      matchKeys: ['college_name', 'category_code', 'year'],
      records,
    };
  }

  async extractFromHtml(html: string): Promise<ExtractedData> {
    const $ = cheerio.load(html);
    const records: Record<string, any>[] = [];

    $('table').each((_, table) => {
      const rows = $(table).find('tr');
      rows.each((i, tr) => {
        if (i === 0) return; // Skip header
        const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
        if (cells.length >= 4) {
          records.push({
            college_name: cells[0],
            category_code: cells[1] || 'General',
            closing_rank: parseInt(cells[cells.length - 1]?.replace(/,/g, '') || '0'),
            year: new Date().getFullYear(),
            body_code: 'AACCC',
          });
        }
      });
    });

    return {
      targetTable: 'cutoffs',
      matchKeys: ['college_name', 'category_code', 'year'],
      records,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private classifyNotice(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('result') || lower.includes('allotment')) return 'result';
    if (lower.includes('seat matrix')) return 'seat_matrix';
    if (lower.includes('registration')) return 'registration';
    if (lower.includes('choice')) return 'choice_filling';
    if (lower.includes('schedule')) return 'schedule';
    if (lower.includes('mop up') || lower.includes('stray')) return 'vacancy';
    return 'general';
  }

  private detectCategory(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('obc')) return 'OBC';
    if (lower.includes('ews')) return 'EWS';
    if (lower.includes('sc')) return 'SC';
    if (lower.includes('st')) return 'ST';
    return 'General';
  }

  private detectAyushCourse(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('bams') || lower.includes('ayurveda')) return 'BAMS';
    if (lower.includes('bhms') || lower.includes('homoeopath')) return 'BHMS';
    if (lower.includes('bums') || lower.includes('unani')) return 'BUMS';
    if (lower.includes('bsms') || lower.includes('siddha')) return 'BSMS';
    if (lower.includes('bnys') || lower.includes('naturopath') || lower.includes('yoga')) return 'BNYS';
    return 'BAMS'; // Default for AACCC
  }
}
