const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
adminClient.rpc('execute_sql', { sql_query: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'organizations'" })
  .then(res => console.log(JSON.stringify(res.data, null, 2)));
