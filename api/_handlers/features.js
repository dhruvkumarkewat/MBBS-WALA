import supabase from './db-client.js';

const FALLBACK_FEATURES = [
  { id: '1', title: 'AI College Predictor', description: 'Real-time probability matrix across 1000+ medical colleges.' },
  { id: '2', title: 'Round-Wise Cutoffs', description: 'Complete MCC AIQ and State Quota closing rank trends.' },
  { id: '3', title: 'Smart Choice Filling', description: 'Optimized choice lock sequence to maximize college tier.' },
  { id: '4', title: 'Permanent Referral Rewards', description: 'Earn ₹500 instant cash reward per referral.' }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error || !data || data.length === 0) {
        return res.status(200).json(FALLBACK_FEATURES);
      }
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.warn('API features fallback:', err.message);
    res.status(200).json(FALLBACK_FEATURES);
  }
}
