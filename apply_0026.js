require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  const client = new Client({ connectionString: uri, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log("Connected successfully to DB!");
    
    const sql = fs.readFileSync('supabase/migrations/0026_remove_installation_documents.sql', 'utf8');
    await client.query(sql);
    console.log("Migration 0026 applied successfully (table dropped)!");
    
    // Verify removal
    const verifyDoc = await client.query(`
      SELECT to_regclass('public.installation_documents') as doc_table;
    `);
    console.log("Documents table (should be null):", verifyDoc.rows);

    // Now delete the storage bucket using API
    const { data: files, error: listErr } = await supabase.storage.from('installation-documents').list();
    if (listErr) {
      console.log("Bucket already deleted or error listing:", listErr.message);
    } else {
      if (files && files.length > 0) {
        const filePaths = files.map(f => f.name);
        await supabase.storage.from('installation-documents').remove(filePaths);
      }
      const { error: delErr } = await supabase.storage.emptyBucket('installation-documents');
      if(delErr) console.log("error emptying", delErr);
      const { data, error: delBucketErr } = await supabase.storage.deleteBucket('installation-documents');
      if (delBucketErr) {
        console.error("Failed to delete bucket via API:", delBucketErr);
      } else {
        console.log("Successfully deleted 'installation-documents' bucket via API.");
      }
    }
  } catch (err) {
    console.error("Error executing migration:", err);
  } finally {
    await client.end();
  }
}

applyMigration().catch(console.error);
