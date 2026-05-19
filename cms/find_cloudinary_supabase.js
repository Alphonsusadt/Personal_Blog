import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scanSupabase() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  const tables = ['artikel', 'projects', 'books'];
  
  for (const table of tables) {
    console.log(`Scanning table "${table}"...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      continue;
    }
    
    console.log(`Found ${data.length} records in "${table}"`);
    for (const record of data) {
      const recordStr = JSON.stringify(record);
      if (recordStr.includes('cloudinary.com')) {
        console.log(`FOUND CLOUDINARY URL in table "${table}" (ID: ${record._id || record.id}):`);
        const regex = /https?:\/\/[^\s"'`()]+cloudinary\.com[^\s"'`()]+/g;
        const matches = recordStr.match(regex);
        if (matches) {
          console.log('URLs:', matches);
        } else {
          console.log('Raw snip:', recordStr.slice(0, 500));
        }
      }
    }
  }
}

scanSupabase().catch(console.error);
