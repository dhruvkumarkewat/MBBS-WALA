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
import { StateAuthorityConfig, getStateAuthorityByCode } from './state-registry.js';
import { createChildLogger } from '../utils/logger.js';
import { env } from '../config/env.js';

const log = createChildLogger('state-scraper');

/**
 * Generic State Counselling Authority Scraper
 * 
 * Works dynamically across any state configured in `state-registry.ts`.
 * Scrapes notices, seat matrix PDFs, round result/cutoff lists, and schedules.
 */
export class StateScraper extends BaseScraper {
  private config: StateAuthorityConfig;

  constructor(configOrCode: StateAuthorityConfig | string) {
    let cfg: StateAuthorityConfig | undefined;
    if (typeof configOrCode === 'string') {
      cfg = getStateAuthorityByCode(configOrCode);
      if (!cfg) {
        throw new Error(`State authority not found for code: ${configOrCode}`);
      }
    } else {
      cfg = configOrCode;
    }

    super(cfg.code, cfg.baseUrl);
    this.config = cfg;
  }

  public getConfig(): StateAuthorityConfig {
    return this.config;
  }

  /**
   * Check State website for new notices, bulletins, and allotment PDFs.
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const newItems: DetectedItem[] = [];
    let pagesChecked = 0;

    for (const pagePath of this.config.noticePages) {
      try {
        const url = pagePath.startsWith('http')
          ? pagePath
          : `${this.baseUrl.replace(/\/$/, '')}/${pagePath.replace(/^\//, '')}`;

        log.info({ url, state: this.config.state }, 'Checking State portal page');

        const response = await axios.get(url, {
          headers: {
            'User-Agent': env.SCRAPER_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: 25000,
        });

        pagesChecked++;
        const $ = cheerio.load(response.data);

        $('a[href]').each((_, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          const text = $el.text().trim();

          if (!text || text.length < 5) return;

          const isPdf = href.toLowerCase().endsWith('.pdf');
          const isExcel =
            href.toLowerCase().endsWith('.xlsx') || href.toLowerCase().endsWith('.xls');
          const isNoticeLink =
            isPdf || isExcel || /notice|allotment|cutoff|seat|merit|counselling/i.test(href);

          if (!isNoticeLink) return;

          let fileUrl = href;
          if (!fileUrl.startsWith('http')) {
            fileUrl = `${this.baseUrl.replace(/\/$/, '')}/${href.replace(/^\//, '')}`;
          }

          const noticeType = this.classifyNotice(text);

          newItems.push({
            title: text,
            description: `${this.config.state} (${this.config.name}): ${text}`,
            noticeType,
            fileUrl,
            fileType: isPdf ? 'pdf' : isExcel ? 'excel' : 'html',
            pageUrl: url,
            priority: this.getPriority(noticeType),
          });
        });
      } catch (err: any) {
        log.warn({ err: err.message, page: pagePath, state: this.config.state }, 'Failed to check State page');
      }
    }

    // Deduplicate by normalized title
    const seen = new Set<string>();
    const unique = newItems.filter((item) => {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter against already stored notices in DB
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
        filtered.push(item);
      }
    }

    return { pagesChecked, newItems: filtered };
  }

  /**
   * Download a file from the State authority portal.
   */
  async downloadFile(url: string, fileType: string): Promise<string> {
    const downloadDir = path.resolve(env.SCRAPER_DOWNLOAD_DIR, 'states', this.config.code.toLowerCase());
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const fileName = `${this.config.code.toLowerCase()}_${Date.now()}.${fileType === 'excel' ? 'xlsx' : fileType}`;
    const filePath = path.join(downloadDir, fileName);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': env.SCRAPER_USER_AGENT },
      timeout: 60000,
    });

    fs.writeFileSync(filePath, response.data);
    log.info({ filePath, size: response.data.length, state: this.config.state }, 'State file downloaded');

    return filePath;
  }

  /**
   * Extract data from downloaded file.
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
   * Extract cutoff & college records from state PDF document.
   */
  private async extractFromPdf(filePath: string): Promise<ExtractedData> {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(filePath);
    const pdf = await pdfParse(buffer);

    const lines = pdf.text.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const records: Record<string, any>[] = [];

    for (const line of lines) {
      const parts = line.split(/\s{2,}|\t/);
      if (parts.length < 3) continue;

      const numbers = parts
        .map((p: string) => p.replace(/,/g, ''))
        .filter((p: string) => /^\d+$/.test(p))
        .map(Number);

      if (numbers.length >= 2) {
        const openingRank = numbers[numbers.length - 2];
        const closingRank = numbers[numbers.length - 1];

        if (openingRank > 0 && closingRank > 0 && closingRank <= 2500000) {
          const textParts = parts.filter((p: string) => !/^\d/.test(p.replace(/,/g, '')));

          records.push({
            college_name: textParts[0] || `${this.config.state} Medical College`,
            state: this.config.state,
            course_name: this.detectCourse(line) || 'MBBS',
            category_code: this.detectCategory(line),
            quota_code: 'SQ', // State Quota
            opening_rank: openingRank,
            closing_rank: closingRank,
            year: new Date().getFullYear(),
            round_name: this.detectRound(line) || 'Final',
          });
        }
      }
    }

    log.info({ filePath, recordCount: records.length, state: this.config.state }, 'State PDF extraction complete');

    return {
      targetTable: 'cutoffs',
      records,
      metadata: {
        totalPages: pdf.numpages,
        extractedAt: new Date().toISOString(),
        bodyCode: this.config.code,
        state: this.config.state,
      },
    };
  }

  /**
   * Extract from state Excel sheet.
   */
  private async extractFromExcel(filePath: string): Promise<ExtractedData> {
    const xlsx = (await import('xlsx')).default;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRecords: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet);

    const records = rawRecords.map((row) => ({
      college_name: row['College'] || row['College Name'] || row['Institute'] || row['Name'] || '',
      state: this.config.state,
      course_name: row['Course'] || this.detectCourse(JSON.stringify(row)) || 'MBBS',
      category_code: row['Category'] || row['Quota Category'] || 'General',
      quota_code: row['Quota'] || 'SQ',
      opening_rank: Number(row['Opening Rank'] || row['AIQ Rank'] || row['Rank'] || 0) || null,
      closing_rank: Number(row['Closing Rank'] || row['Cutoff'] || 0) || null,
      year: Number(row['Year'] || new Date().getFullYear()),
    })).filter((r) => r.college_name && (r.closing_rank || r.opening_rank));

    return {
      targetTable: 'cutoffs',
      records,
      metadata: {
        sheetName,
        totalRows: rawRecords.length,
        extractedAt: new Date().toISOString(),
        bodyCode: this.config.code,
        state: this.config.state,
      },
    };
  }

  private detectCourse(text: string): string {
    const upper = text.toUpperCase();
    if (upper.includes('BAMS')) return 'BAMS';
    if (upper.includes('BHMS')) return 'BHMS';
    if (upper.includes('BUMS')) return 'BUMS';
    if (upper.includes('BSMS')) return 'BSMS';
    if (upper.includes('BNYS')) return 'BNYS';
    if (upper.includes('BDS')) return 'BDS';
    if (upper.includes('MBBS')) return 'MBBS';
    return 'MBBS';
  }

  private detectRound(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('round 1') || lower.includes('round-1') || lower.includes('r1')) return 'Round 1';
    if (lower.includes('round 2') || lower.includes('round-2') || lower.includes('r2')) return 'Round 2';
    if (lower.includes('round 3') || lower.includes('round-3') || lower.includes('r3')) return 'Round 3';
    if (lower.includes('mop') || lower.includes('mopup')) return 'Mop Up';
    if (lower.includes('stray')) return 'Stray Vacancy';
    return 'Final';
  }

  private classifyNotice(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('allotment') || lower.includes('result') || lower.includes('merit')) return 'result';
    if (lower.includes('seat') || lower.includes('matrix') || lower.includes('vacancy')) return 'seat_matrix';
    if (lower.includes('schedule') || lower.includes('time table') || lower.includes('dates')) return 'schedule';
    if (lower.includes('registration') || lower.includes('application') || lower.includes('apply')) return 'registration';
    if (lower.includes('choice') || lower.includes('option') || lower.includes('locking')) return 'choice_filling';
    if (lower.includes('reporting') || lower.includes('admission')) return 'reporting';
    if (lower.includes('fee') || lower.includes('bond')) return 'fee';
    if (lower.includes('corrigendum') || lower.includes('correction')) return 'correction';
    return 'general';
  }

  private getPriority(noticeType: string): string {
    const urgentTypes = ['result', 'registration', 'choice_filling', 'seat_matrix'];
    if (urgentTypes.includes(noticeType)) return 'urgent';
    if (noticeType === 'schedule') return 'high';
    return 'normal';
  }
}
