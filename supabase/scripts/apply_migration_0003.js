const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  let dbUrl = process.env.DATABASE_URL;
  dbUrl = dbUrl.replace('[iKiz.!j7$KCWaim]', encodeURIComponent('[iKiz.!j7$KCWaim]'));

  const client = new Client({
    connectionString: dbUrl
  });

  try {
    await client.connect();
    const sql = fs.readFileSync('supabase/migrations/0003_atomic_sale.sql', 'utf8');
    await client.query(sql);
    console.log("Migration 0003 applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
