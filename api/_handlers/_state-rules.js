/**
 * _state-rules.js
 *
 * Per-state quota availability and eligibility rules for NEET UG admissions.
 *
 * Data model per state:
 * {
 *   counselling_authority: string          // primary state counselling body name
 *   government: {
 *     aiq: { available, domicile_required, counselling }
 *     state_quota: { available, domicile_required, counselling }
 *   }
 *   private: {
 *     state_quota:    { available, domicile_required, counselling, note? }
 *     management:     { available, non_domicile_allowed, counselling, note? }
 *     institutional:  { available, non_domicile_allowed, note? }
 *     nri:            { available, sponsor_allowed, note? }
 *     minority:       { available, note? }
 *   }
 * }
 *
 * non_domicile_allowed meanings:
 *   true        — Any India candidate may apply
 *   false       — Only domicile/local candidates
 *   "conditional" — Depends on college-level rules (treat as possibly eligible)
 *
 * Sources: MCC guidelines, state counselling committee documents, NMC regulations.
 * Last verified: 2025 counselling cycle. Always confirm on official portals.
 */

export const STATE_RULES = {

  // ── Karnataka ────────────────────────────────────────────────────────────────
  karnataka: {
    counselling_authority: 'KEA (Karnataka Examinations Authority)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'KEA' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'KEA',
        note: 'Government quota seats (50%) in private colleges via KEA' },
      management: { available: true, non_domicile_allowed: true, counselling: 'KEA/Institution',
        note: 'Management quota (15%) open to all-India candidates; NRI quota (35%) also common' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true, note: '35% NRI/NRI-sponsored seats in many KA private colleges' },
      minority: { available: 'college_specific', note: 'Applicable in minority-designated colleges only' },
    },
  },

  // ── Tamil Nadu ───────────────────────────────────────────────────────────────
  'tamil nadu': {
    counselling_authority: 'TNMGRMU / TN Medical Counselling Committee',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'TN MCC' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'TN MCC',
        note: '65% Government quota seats via TN counselling' },
      management: { available: true, non_domicile_allowed: true, counselling: 'Institution',
        note: '35% management/NRI seats; non-domicile allowed by institution' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Kerala ──────────────────────────────────────────────────────────────────
  kerala: {
    counselling_authority: 'Commissioner for Entrance Examinations (CEE Kerala)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'CEE Kerala' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'CEE Kerala',
        note: '50% Government quota; domicile generally required' },
      management: { available: true, non_domicile_allowed: true, counselling: 'CEE Kerala/Institution',
        note: '50% management seats; non-domicile candidates often admitted' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Telangana ────────────────────────────────────────────────────────────────
  telangana: {
    counselling_authority: 'TSCHE (Telangana State Council of Higher Education)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'TSCHE' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'TSCHE',
        note: '70% state quota seats via TSCHE' },
      management: { available: true, non_domicile_allowed: true, counselling: 'TSCHE/Institution',
        note: '30% management/NRI; open to all-India candidates' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Andhra Pradesh ───────────────────────────────────────────────────────────
  'andhra pradesh': {
    counselling_authority: 'APSCHE / Dr. NTRUHS',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'APSCHE' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'APSCHE' },
      management: { available: true, non_domicile_allowed: true, counselling: 'APSCHE/Institution',
        note: '30% management/NRI seats; non-domicile often permitted' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Maharashtra ──────────────────────────────────────────────────────────────
  maharashtra: {
    counselling_authority: 'DMER Maharashtra',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'DMER Maharashtra' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'DMER Maharashtra',
        note: '70% state quota (open + reserved) via DMER' },
      management: { available: true, non_domicile_allowed: false, counselling: 'DMER Maharashtra',
        note: '30% management seats filled via DMER; MH domicile generally required for state-counselling MQ seats' },
      institutional: { available: true, non_domicile_allowed: 'conditional',
        note: 'Some MH private colleges have Institutional Quota; eligibility varies' },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific',
        note: 'Significant minority institutions (CMC, St George etc.) with separate minority quota' },
    },
  },

  // ── Gujarat ──────────────────────────────────────────────────────────────────
  gujarat: {
    counselling_authority: 'ACPUGMEC (Admission Committee for Professional UG Medical Courses)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'ACPUGMEC' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'ACPUGMEC' },
      management: { available: true, non_domicile_allowed: false, counselling: 'ACPUGMEC',
        note: 'Gujarat management quota via state counselling; Gujarat domicile required for MQ seats under state authority' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Rajasthan ────────────────────────────────────────────────────────────────
  rajasthan: {
    counselling_authority: 'Rajasthan University of Health Sciences (RUHS)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'RUHS' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'RUHS' },
      management: { available: true, non_domicile_allowed: true, counselling: 'RUHS/Institution',
        note: 'Management quota available; non-domicile candidates can apply at many institutions' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── West Bengal ──────────────────────────────────────────────────────────────
  'west bengal': {
    counselling_authority: 'WBMCC (West Bengal Medical Counselling Committee)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'WBMCC' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'WBMCC' },
      management: { available: true, non_domicile_allowed: true, counselling: 'WBMCC/Institution',
        note: 'Management quota open; non-domicile candidates permitted in private colleges' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Bihar ────────────────────────────────────────────────────────────────────
  bihar: {
    counselling_authority: 'BCECEB (Bihar Combined Entrance Competitive Examination Board)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'BCECEB' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'BCECEB' },
      management: { available: true, non_domicile_allowed: true, counselling: 'Institution',
        note: 'Private colleges in Bihar may have management seats; non-domicile often permitted' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Jharkhand ────────────────────────────────────────────────────────────────
  jharkhand: {
    counselling_authority: 'JCECEB (Jharkhand Combined Entrance Competitive Examination Board)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'JCECEB' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'JCECEB' },
      management: { available: true, non_domicile_allowed: true, counselling: 'Institution',
        note: 'Management quota in private colleges; non-domicile candidates generally permitted' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Chhattisgarh ─────────────────────────────────────────────────────────────
  chhattisgarh: {
    counselling_authority: 'CGDME (Chhattisgarh Directorate of Medical Education)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'CGDME' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'CGDME' },
      management: { available: true, non_domicile_allowed: true, counselling: 'CGDME/Institution',
        note: 'Management quota open; non-domicile (any state) candidates can apply to CG private colleges' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Haryana ──────────────────────────────────────────────────────────────────
  haryana: {
    counselling_authority: 'PGIMS / UHSR Rohtak',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'UHSR' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'UHSR' },
      management: { available: true, non_domicile_allowed: true, counselling: 'Institution',
        note: 'Management quota in Haryana private colleges; non-domicile candidates permitted' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Punjab ───────────────────────────────────────────────────────────────────
  punjab: {
    counselling_authority: 'BFUHS (Baba Farid University of Health Sciences)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'BFUHS' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'BFUHS' },
      management: { available: true, non_domicile_allowed: true, counselling: 'BFUHS/Institution',
        note: 'Management quota available; non-domicile candidates permitted' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Uttarakhand ──────────────────────────────────────────────────────────────
  uttarakhand: {
    counselling_authority: 'HNB Uttarakhand Medical Education University',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'HNB Medical University' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'HNB Medical University' },
      management: { available: true, non_domicile_allowed: true, counselling: 'Institution',
        note: 'Management quota seats available; non-domicile often permitted in Uttarakhand private colleges' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Himachal Pradesh ─────────────────────────────────────────────────────────
  'himachal pradesh': {
    counselling_authority: 'HPMC (HP Medical Counselling Board)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'HPMC' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'HPMC' },
      management: { available: true, non_domicile_allowed: true, counselling: 'HPMC/Institution',
        note: 'Management quota seats in HP private colleges; non-domicile candidates permitted' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Odisha ───────────────────────────────────────────────────────────────────
  odisha: {
    counselling_authority: 'OJEE / DMET Odisha',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'DMET Odisha' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'DMET Odisha' },
      management: { available: true, non_domicile_allowed: true, counselling: 'Institution',
        note: 'Management quota available in Odisha private colleges' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Assam ────────────────────────────────────────────────────────────────────
  assam: {
    counselling_authority: 'SEBA / Assam Medical College',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'Assam State Counselling' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'Assam State Counselling' },
      management: { available: true, non_domicile_allowed: true, counselling: 'Institution',
        note: 'Management quota in Assam private colleges; non-domicile generally permitted' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Madhya Pradesh ──────────────────────────────────────────────────────────
  // IMPORTANT: MP private medical seats are admitted through DMET MP state counselling.
  // There is no separate Management Quota outside state counselling in MP.
  'madhya pradesh': {
    counselling_authority: 'DMET MP (Directorate of Medical Education)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'DMET MP' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'DMET MP',
        note: 'Private college seats (both quota and fee) filled via DMET MP state counselling' },
      management: { available: false,
        note: 'No separate Management Quota in MP. Private seats go through DMET MP state counselling. Select State Quota.' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true, note: 'NRI quota exists in some MP private colleges' },
      minority: { available: 'college_specific' },
    },
  },

  // ── Uttar Pradesh ────────────────────────────────────────────────────────────
  'uttar pradesh': {
    counselling_authority: 'DGME UP (Directorate General of Medical Education)',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'DGME UP' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'DGME UP',
        note: 'Private college seats managed by DGME UP; UP domicile required' },
      management: { available: false,
        note: 'No separate Management Quota in UP. Private seats are part of state counselling via DGME UP.' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Delhi ────────────────────────────────────────────────────────────────────
  delhi: {
    counselling_authority: 'DGHS Delhi',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'DGHS Delhi' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'DGHS Delhi' },
      management: { available: false,
        note: 'No separate Management Quota in Delhi. Private college seats via DGHS Delhi counselling.' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Puducherry ───────────────────────────────────────────────────────────────
  puducherry: {
    counselling_authority: 'DSTE Puducherry',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'DSTE Puducherry' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'DSTE Puducherry' },
      management: { available: true, non_domicile_allowed: true, counselling: 'Institution',
        note: 'Management/NRI seats in Sri Manakula Vinayagar etc.; non-domicile may apply' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: true },
      minority: { available: 'college_specific' },
    },
  },

  // ── Jammu and Kashmir ────────────────────────────────────────────────────────
  'jammu and kashmir': {
    counselling_authority: 'BOPEE J&K',
    government: {
      aiq: { available: true, domicile_required: false, counselling: 'MCC' },
      state_quota: { available: true, domicile_required: true, counselling: 'BOPEE J&K' },
    },
    private: {
      state_quota: { available: true, domicile_required: true, counselling: 'BOPEE J&K' },
      management: { available: false,
        note: 'Limited private medical colleges; seats via BOPEE state counselling' },
      institutional: { available: false },
      nri: { available: true, sponsor_allowed: false },
      minority: { available: false },
    },
  },
};

/**
 * Normalize state name string to the key used in STATE_RULES.
 * Handles variations like "Madhya Pradesh", "madhya pradesh", "MP" etc.
 */
export function normalizeStateName(rawState) {
  if (!rawState) return null;
  const s = rawState.trim().toLowerCase();
  // Common abbreviations
  const abbrevMap = {
    'mp': 'madhya pradesh',
    'up': 'uttar pradesh',
    'wb': 'west bengal',
    'ap': 'andhra pradesh',
    'tn': 'tamil nadu',
    'ka': 'karnataka',
    'kl': 'kerala',
    'mh': 'maharashtra',
    'gj': 'gujarat',
    'rj': 'rajasthan',
    'cg': 'chhattisgarh',
    'hr': 'haryana',
    'pb': 'punjab',
    'uk': 'uttarakhand',
    'hp': 'himachal pradesh',
    'od': 'odisha',
    'ts': 'telangana',
    'as': 'assam',
    'br': 'bihar',
    'jh': 'jharkhand',
    'dl': 'delhi',
    'jk': 'jammu and kashmir',
    'j&k': 'jammu and kashmir',
    'pondicherry': 'puducherry',
  };
  return abbrevMap[s] || s;
}

/**
 * Get state rules for a given state name (case-insensitive).
 * Returns null if state is not in the database.
 */
export function getStateRules(stateName) {
  const key = normalizeStateName(stateName);
  if (!key) return null;
  // Direct match
  if (STATE_RULES[key]) return STATE_RULES[key];
  // Partial match (e.g. "jammu and kashmir" matches "jammu & kashmir")
  for (const [k, v] of Object.entries(STATE_RULES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}
