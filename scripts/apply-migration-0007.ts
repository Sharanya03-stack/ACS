import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  url.password = encodeURIComponent(url.password);
  
  const client = new Client({
    connectionString: url.toString(),
  });

  await client.connect();

  try {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/0007_storage_installation_photos.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration 0007_storage_installation_photos.sql...');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
