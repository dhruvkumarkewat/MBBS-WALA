import { getAdminClient } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('round-detection');

/**
 * Round Detection Service
 *
 * Monitors counselling notices and automatically detects round state transitions.
 * State machine: LOCKED → ANNOUNCED → REGISTRATION → CHOICE_FILLING → ALLOTMENT → REPORTING → COMPLETED
 *
 * CRITICAL: Never activates future rounds before the official schedule confirms they have started.
 */
export class RoundDetectionService {
  private db = getAdminClient();

  /**
   * Round state machine transitions.
   * Each state can only transition to specific next states.
   */
  private readonly VALID_TRANSITIONS: Record<string, string[]> = {
    locked: ['announced'],
    announced: ['registration'],
    registration: ['choice_filling'],
    choice_filling: ['choice_locked'],
    choice_locked: ['allotment'],
    allotment: ['reporting'],
    reporting: ['completed'],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
  };

  /**
   * Keywords that trigger round state transitions.
   * Mapped to: { round_pattern, status_transition }
   */
  private readonly TRANSITION_KEYWORDS = [
    {
      patterns: ['registration.*open', 'fresh registration', 'registration window'],
      targetStatus: 'registration',
    },
    {
      patterns: ['choice filling.*open', 'choice filling.*started', 'fill.*choice'],
      targetStatus: 'choice_filling',
    },
    {
      patterns: ['choice.*lock', 'last date.*choice'],
      targetStatus: 'choice_locked',
    },
    {
      patterns: ['seat allotment.*result', 'allotment.*published', 'provisional.*result'],
      targetStatus: 'allotment',
    },
    {
      patterns: ['reporting.*started', 'reporting.*open', 'join.*college', 'document.*verification'],
      targetStatus: 'reporting',
    },
    {
      patterns: ['round.*completed', 'round.*concluded', 'round.*over'],
      targetStatus: 'completed',
    },
  ];

  /**
   * Detect round status changes from recent notices.
   * Called after the scraper finds new notices.
   */
  async detectAndUpdateRounds(bodyCode: string): Promise<void> {
    log.info({ bodyCode }, 'Running round detection');

    // Get recent unprocessed notices
    const { data: notices } = await this.db
      .from('counselling_notices')
      .select('*')
      .eq('body_id', bodyCode)
      .eq('is_processed', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!notices || notices.length === 0) {
      log.info({ bodyCode }, 'No new notices to process');
      return;
    }

    // Get current active rounds
    const { data: currentRounds } = await this.db
      .from('counselling_rounds')
      .select(`
        *,
        counselling_sessions!inner (
          id,
          year,
          counselling_bodies!inner ( code )
        )
      `)
      .not('status', 'in', '("completed","cancelled")')
      .order('round_number', { ascending: true });

    for (const notice of notices) {
      const title = (notice.title || '').toLowerCase();
      const description = (notice.description || '').toLowerCase();
      const text = `${title} ${description}`;

      // Detect which round this notice is about
      const roundNumber = this.detectRoundNumber(text);

      // Detect the target status
      for (const transition of this.TRANSITION_KEYWORDS) {
        const matches = transition.patterns.some((p) => new RegExp(p, 'i').test(text));
        if (!matches) continue;

        // Find the corresponding round in DB
        const matchingRound = (currentRounds || []).find((r: any) => {
          const isCorrectBody = r.counselling_sessions?.counselling_bodies?.code === bodyCode;
          const isCorrectRound = roundNumber ? r.round_number === roundNumber : true;
          return isCorrectBody && isCorrectRound;
        });

        if (matchingRound) {
          // Validate the transition is legal
          const currentStatus = matchingRound.status;
          const validNextStates = this.VALID_TRANSITIONS[currentStatus] || [];

          if (validNextStates.includes(transition.targetStatus)) {
            log.info(
              {
                bodyCode,
                round: matchingRound.round_name,
                from: currentStatus,
                to: transition.targetStatus,
                notice: notice.title,
              },
              'Round status transition detected'
            );

            // Update round status
            await this.db
              .from('counselling_rounds')
              .update({
                status: transition.targetStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', matchingRound.id);

            // If a new round is being announced, deactivate the previous one
            if (
              transition.targetStatus === 'announced' &&
              roundNumber &&
              roundNumber > 1
            ) {
              await this.deactivatePreviousRound(bodyCode, roundNumber - 1);
            }

            // Create audit log
            await this.db.from('audit_logs').insert({
              action: 'round_status_change',
              entity_type: 'counselling_round',
              entity_id: matchingRound.id,
              old_value: { status: currentStatus },
              new_value: { status: transition.targetStatus },
              metadata: { notice_id: notice.id, notice_title: notice.title },
            });
          } else {
            log.warn(
              {
                bodyCode,
                round: matchingRound.round_name,
                currentStatus,
                attemptedStatus: transition.targetStatus,
              },
              'Invalid round state transition detected — ignoring'
            );
          }
        }

        break; // Only apply the first matching transition
      }

      // Mark notice as processed
      await this.db
        .from('counselling_notices')
        .update({ is_processed: true })
        .eq('id', notice.id);
    }
  }

  /**
   * Detect which round number a notice is about.
   */
  private detectRoundNumber(text: string): number | null {
    const roundMatch = text.match(/round[\s-]*(\d)/i);
    if (roundMatch) return parseInt(roundMatch[1]);

    if (text.includes('mop up') || text.includes('mop-up')) return 4;
    if (text.includes('stray vacancy')) return 5;
    if (text.includes('special stray')) return 6;

    return null;
  }

  /**
   * Deactivate a previous round when the next one is announced.
   */
  private async deactivatePreviousRound(bodyCode: string, roundNumber: number): Promise<void> {
    log.info({ bodyCode, roundNumber }, 'Deactivating previous round');

    const { data: previousRounds } = await this.db
      .from('counselling_rounds')
      .select(`
        id,
        status,
        counselling_sessions!inner (
          counselling_bodies!inner ( code )
        )
      `)
      .eq('round_number', roundNumber)
      .not('status', 'eq', 'completed');

    for (const round of previousRounds || []) {
      if ((round as any).counselling_sessions?.counselling_bodies?.code === bodyCode) {
        await this.db
          .from('counselling_rounds')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', round.id);
      }
    }
  }
}
