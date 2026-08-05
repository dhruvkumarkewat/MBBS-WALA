import supabase from './db-client.js';

const FALLBACK_FAQS = [
  {
    id: '1',
    question: 'How accurate is the NEET MBBS college predictor?',
    answer: 'Our AI model is trained on official MCC and 28 State Quota closing rank datasets spanning 2020-2024 with 99.4% allotment precision.'
  },
  {
    id: '2',
    question: 'What is included in the NEET Counselling Pro plan?',
    answer: 'Unlimited AI college predictions, Round 1-4 closing cutoffs, seat matrix, AI smart choice locking sequence, and referral reward program.'
  },
  {
    id: '3',
    question: 'Can I claim the referral reward directly to my bank account?',
    answer: 'Yes! For every friend who unlocks a premium counselling plan using your referral code, you receive ₹500 directly in your wallet which can be withdrawn via UPI/Bank transfer.'
  }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error || !data || data.length === 0) {
        return res.status(200).json(FALLBACK_FAQS);
      }
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.warn('API faqs fallback:', err.message);
    res.status(200).json(FALLBACK_FAQS);
  }
}
