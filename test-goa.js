import { supabase } from './api/_handlers/db-client.js';
async function test() {
  const { data, error } = await supabase.from('cutoffs').select('college_name, category, closing_rank, quota_code').ilike('state', '%Goa%').limit(5);
  console.log('Goa cutoffs:', data);
  const { data: c, error: e } = await supabase.from('colleges').select('name').ilike('state', '%Goa%').limit(5);
  console.log('Goa colleges:', c);
}
test();
