const { Client } = require('pg');
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const client = new Client({ connectionString: uri });
client.connect().then(() => client.query("SELECT policyname, qual, with_check FROM pg_policies WHERE tablename IN ('vehicles', 'chargers') ORDER BY tablename")).then(res => { console.log(JSON.stringify(res.rows, null, 2)); client.end(); });
