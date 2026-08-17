import dotenv from 'dotenv';
dotenv.config();
import handler from './api/_handlers/profile.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const req = {
    method: 'PUT',
    headers: {
      authorization: `Bearer test`
    },
    body: {
      neet_rank: 335120,
      category: 'General',
      exam_track: 'MBBS/BDS',
      exam: 'NEET UG'
    }
  };

  const res = {
    status: (code) => ({
      json: (data) => console.log('STATUS:', code, 'DATA:', data),
      end: () => console.log('STATUS:', code, 'END')
    }),
    setHeader: () => {}
  };

  // Mock requireUser to just return a dummy user ID that we know or an arbitrary one
  // Actually, we can just insert a temporary test user or override requireUser if we could, but let's see.
}
test();
