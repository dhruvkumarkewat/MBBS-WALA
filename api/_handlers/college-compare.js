import supabase from './db-client.js';

function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findSeat(seats, collegeName) {
  const key = normalize(collegeName);
  let best = null;
  for (const s of seats || []) {
    const k = normalize(s.college_name);
    if (k === key || k.includes(key.slice(0, 14)) || key.includes(k.slice(0, 14))) {
      best = s;
      break;
    }
  }
  return best;
}

function findCutoffs(cutoffs, collegeName) {
  const key = normalize(collegeName);
  return (cutoffs || []).filter((c) => {
    const k = normalize(c.college_name);
    return k === key || k.includes(key.slice(0, 14)) || key.includes(k.slice(0, 14));
  });
}

async function loadCollegeBundle(id) {
  const { data: college, error } = await supabase
    .from('colleges')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!college) return null;

  const [{ data: cutoffs }, { data: seats }] = await Promise.all([
    supabase.from('cutoffs').select('*').order('category'),
    supabase.from('seat_matrix').select('*'),
  ]);

  const relatedCutoffs = findCutoffs(cutoffs, college.name);
  const seat = findSeat(seats, college.name);

  const byCat = {};
  relatedCutoffs.forEach((c) => {
    byCat[c.category] = c;
  });

  return {
    college,
    seat,
    cutoffs: relatedCutoffs,
    cutoff_by_category: byCat,
    highlights: {
      general_aiq: byCat.General?.aiq_rank ?? null,
      general_state: byCat.General?.state_rank_range ?? null,
      total_seats: seat?.total_seats ?? null,
      open_seats: seat?.open_seats ?? null,
      all_india: seat?.all_india ?? null,
      nri_seats: seat?.nri_seats ?? null,
      college_kind: seat?.college_kind || college.college_type,
    },
  };
}

function verdict(a, b) {
  const tips = [];
  const ag = a.highlights.general_aiq;
  const bg = b.highlights.general_aiq;
  if (ag && bg) {
    if (ag < bg) tips.push(`${a.college.name} is more competitive on AIQ (closes earlier).`);
    else if (bg < ag) tips.push(`${b.college.name} is more competitive on AIQ (closes earlier).`);
    else tips.push('Similar AIQ closing ranks historically.');
  } else if (ag || bg) {
    tips.push('Cutoff history is available for only one of these colleges in our MP dataset.');
  } else {
    tips.push('Detailed MP cutoff rows not linked yet — compare location and type, then verify official cutoffs.');
  }

  const as = a.highlights.total_seats;
  const bs = b.highlights.total_seats;
  if (as && bs) {
    if (as > bs) tips.push(`${a.college.name} offers more total seats (${as} vs ${bs}).`);
    else if (bs > as) tips.push(`${b.college.name} offers more total seats (${bs} vs ${as}).`);
  }

  if (a.college.state && b.college.state && a.college.state !== b.college.state) {
    tips.push(`Different states (${a.college.state} vs ${b.college.state}) — domicile rules matter for state quota.`);
  }

  if (a.college.college_type !== b.college.college_type) {
    tips.push(`Type differs: ${a.college.college_type} vs ${b.college.college_type} — fees and bonds usually differ sharply.`);
  }

  return tips;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const aId = req.query.a;
    const bId = req.query.b;
    if (!aId || !bId) {
      return res.status(400).json({ error: 'Query params a and b (college ids) are required' });
    }

    const [left, right] = await Promise.all([loadCollegeBundle(aId), loadCollegeBundle(bId)]);
    if (!left || !right) return res.status(404).json({ error: 'One or both colleges not found' });

    const fields = [
      { key: 'City', a: left.college.city, b: right.college.city },
      { key: 'State', a: left.college.state || '—', b: right.college.state || '—' },
      { key: 'Country', a: left.college.country, b: right.college.country },
      { key: 'Type', a: left.college.college_type, b: right.college.college_type },
      { key: 'Course', a: left.college.course || 'MBBS', b: right.college.course || 'MBBS' },
      {
        key: 'Total seats',
        a: left.highlights.total_seats ?? '—',
        b: right.highlights.total_seats ?? '—',
        better:
          left.highlights.total_seats && right.highlights.total_seats
            ? left.highlights.total_seats > right.highlights.total_seats
              ? 'a'
              : left.highlights.total_seats < right.highlights.total_seats
              ? 'b'
              : null
            : null,
      },
      {
        key: 'Open seats',
        a: left.highlights.open_seats ?? '—',
        b: right.highlights.open_seats ?? '—',
      },
      {
        key: 'AIQ seats',
        a: left.highlights.all_india ?? '—',
        b: right.highlights.all_india ?? '—',
      },
      {
        key: 'NRI seats',
        a: left.highlights.nri_seats ?? '—',
        b: right.highlights.nri_seats ?? '—',
      },
      {
        key: 'AIQ Gen closing rank',
        a: left.highlights.general_aiq?.toLocaleString?.() || left.highlights.general_aiq || '—',
        b: right.highlights.general_aiq?.toLocaleString?.() || right.highlights.general_aiq || '—',
        better:
          left.highlights.general_aiq && right.highlights.general_aiq
            ? left.highlights.general_aiq > right.highlights.general_aiq
              ? 'a' // higher closing rank = easier
              : left.highlights.general_aiq < right.highlights.general_aiq
              ? 'b'
              : null
            : null,
        hint: 'Higher closing rank usually means relatively easier AIQ access',
      },
      {
        key: 'State Gen rank band',
        a: left.highlights.general_state || '—',
        b: right.highlights.general_state || '—',
      },
    ];

    // category cutoff matrix
    const cats = ['General', 'OBC', 'EWS', 'SC', 'ST'];
    const category_matrix = cats.map((cat) => ({
      category: cat,
      a: left.cutoff_by_category[cat]
        ? {
            aiq_rank: left.cutoff_by_category[cat].aiq_rank,
            aiq_score: left.cutoff_by_category[cat].aiq_score,
            state_rank_range: left.cutoff_by_category[cat].state_rank_range,
          }
        : null,
      b: right.cutoff_by_category[cat]
        ? {
            aiq_rank: right.cutoff_by_category[cat].aiq_rank,
            aiq_score: right.cutoff_by_category[cat].aiq_score,
            state_rank_range: right.cutoff_by_category[cat].state_rank_range,
          }
        : null,
    }));

    return res.status(200).json({
      a: left,
      b: right,
      fields,
      category_matrix,
      insights: verdict(left, right),
    });
  } catch (err) {
    console.error('college-compare error:', err);
    res.status(500).json({ error: err.message });
  }
}
