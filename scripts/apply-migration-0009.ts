import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

require('dotenv').config({ path: '.env.local' });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not found');

  // Strip brackets from password
  const cleanUrl = dbUrl.replace(/\[|\]/g, '');
  
  const client = new Client({ connectionString: cleanUrl });
  await client.connect();

  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/0009_installation_categories.sql'), 'utf8');
  
  try {
    await client.query(sql);
    console.log('Migration 0009 applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

main();
