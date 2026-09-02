const fs = require('fs');
const { Client } = require('pg');

const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;

async function applyMigration() {
  const client = new Client({ connectionString: uri, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log("Connected successfully to DB!");
    
    const sql = fs.readFileSync('supabase/migrations/0025_installation_orders.sql', 'utf8');
    await client.query(sql);
    console.log("Migration 0025 applied successfully!");
    
    const verify = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'installations'
        AND column_name IN ('remarks', 'tracking_token');
    `);
    console.log("Installations columns:", verify.rows);
    
    const verifyDoc = await client.query(`
      SELECT to_regclass('public.installation_documents') as doc_table;
    `);
    console.log("Documents table:", verifyDoc.rows);
  } catch (err) {
    console.error("Error executing migration:", err);
  } finally {
    await client.end();
  }
}

applyMigration().catch(console.error);
