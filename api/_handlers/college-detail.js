import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'College ID or Name is required' });
      }

      // 1. Fetch base college details
      const { data: college, error: collegeError } = await supabase
        .from('colleges')
        .select('*')
        .or(`id.eq."${id}",name.eq."${id}"`)
        .single();

      if (collegeError) throw collegeError;
      if (!college) {
        return res.status(404).json({ error: 'College not found' });
      }

      // 2. Fetch Cutoffs
      const { data: cutoffs, error: cutoffsError } = await supabase
        .from('cutoffs')
        .select('*')
        .eq('college_name', college.name)
        .order('year', { ascending: false });

      if (cutoffsError) console.error('Cutoffs error:', cutoffsError);

      // 3. Fetch Fees (from old 'fees' table, if any)
      // The fees table might use college_name or college_id. We'll try college_name first.
      const { data: fees, error: feesError } = await supabase
        .from('fees')
        .select('*')
        .eq('college_name', college.name);

      // 4. Fetch Seat Matrix
      const { data: seatMatrix, error: seatMatrixError } = await supabase
        .from('seat_matrix')
        .select('*')
        .eq('college_name', college.name);
        
      // 5. Structure the payload
      const payload = {
        college,
        cutoffs: cutoffs || [],
        fees: fees || [],
        seatMatrix: seatMatrix || [],
        // Mocking missing tables for now until DB is fully populated
        facilities: [],
        faculty: [],
        reviews: [],
        gallery: [],
        rankings: [],
        aiInsights: {
          summary: "Data Not Available",
          pros: [],
          cons: []
        }
      };

      return res.status(200).json(payload);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
