import supabase from './api/_handlers/db-client.js';

async function run() {
  const { data, error } = await supabase.from('cutoffs').select('*').limit(1);
  console.log('Cutoffs schema:', data);
  
  const { data: cols } = await supabase.from('colleges').select('*').limit(1);
  console.log('Colleges schema:', cols);
}
run();
