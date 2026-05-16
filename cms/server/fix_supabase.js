import 'dotenv/config';
import { supabase } from './config/supabase.js';

async function run() {
  console.log('Fetching articles from Supabase...');
  const { data: articles, error } = await supabase.from('artikel').select('*');
  if (error) {
    console.error('Error fetching articles:', error);
    process.exit(1);
  }

  for (const a of articles) {
    if (a.title && typeof a.title === 'string' && a.title.includes('{"en":""')) {
      const fixedTitle = 'Tulisan Khusus Indonesia';
      console.log(`Fixing title for ${a._id}...`);
      await supabase.from('artikel').update({ title: fixedTitle }).eq('_id', a._id);
    }
    if (a.title && typeof a.title === 'string' && a.title.includes('Test Bilingual')) {
      const fixedTitle = 'English Writing Test';
      console.log(`Fixing title for ${a._id}...`);
      await supabase.from('artikel').update({ title: fixedTitle }).eq('_id', a._id);
    }
  }

  console.log('Fetching projects from Supabase...');
  const { data: projects, error: err2 } = await supabase.from('projects').select('*');
  if (err2) {
    console.log('No projects table or error:', err2.message);
  } else {
    for (const p of projects) {
      if (p.title && typeof p.title === 'string' && p.title.includes('{"en":""')) {
        const fixedTitle = 'Proyek Khusus Indonesia';
        console.log(`Fixing project for ${p._id}...`);
        await supabase.from('projects').update({ title: fixedTitle }).eq('_id', p._id);
      }
    }
  }

  console.log('Done.');
  process.exit(0);
}

run();
