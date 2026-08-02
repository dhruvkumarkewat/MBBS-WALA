const rows = require('/tmp/state_seed.json');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
function get(k) {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return (m ? m[1] : '').trim().replace(/^["']|["']$/g, '');
}
const url = get('NEXT_PUBLIC_SUPABASE_URL');
const key = get('SUPABASE_SERVICE_ROLE_KEY');
console.log('url', url);
(async () => {
  for (let i = 0; i < rows.length; i += 12) {
    const chunk = rows.slice(i, i + 12);
    const res = await fetch(url + '/rest/v1/state_competition', {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    console.log(i, res.status, await res.text());
  }
})();
