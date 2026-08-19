const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
  console.log("Testing relationships...");
  const { data, error } = await supabase
    .from('installations')
    .select(`
      id,
      status,
      vehicles (model),
      organizations!installations_dealer_id_fkey (name)
    `)
    .limit(1);

  if (error) {
    console.error("Query failed:", error);
  } else {
    console.log("Query succeeded:", data);
  }
}

testQuery();
