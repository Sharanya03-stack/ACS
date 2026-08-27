require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL.replace(':5432', ':6543')
});

async function main() {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
    
    // Execute migration
    const fs = require('fs');
    const sql = fs.readFileSync('supabase/migrations/0015_notifications.sql', 'utf8');
    await client.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error('Connection error', err.stack);
  } finally {
    await client.end();
  }
}
main();
