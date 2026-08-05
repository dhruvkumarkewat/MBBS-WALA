import supabase from './db-client.js';

const FALLBACK_TESTIMONIALS = [
  {
    id: '1',
    name: 'Aarav Sharma',
    score: '685/720',
    college: 'AIIMS New Delhi',
    quote: 'The college predictor and AI choice filling were spot on. Got my dream seat in Round 1!',
    rating: 5
  },
  {
    id: '2',
    name: 'Priya Patel',
    score: '642/720',
    college: 'KGMU Lucknow',
    quote: 'Counselor guidance and cutoff trends helped me avoid penalty and secure state quota easily.',
    rating: 5
  },
  {
    id: '3',
    name: 'Rohit Verma',
    score: '618/720',
    college: 'BJMC Ahmedabad',
    quote: 'Extremely detailed round cutoffs and seat matrix. Made choice filing hassle-free.',
    rating: 5
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
        .from('testimonials')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error || !data || data.length === 0) {
        return res.status(200).json(FALLBACK_TESTIMONIALS);
      }
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.warn('API testimonials fallback:', err.message);
    res.status(200).json(FALLBACK_TESTIMONIALS);
  }
}
