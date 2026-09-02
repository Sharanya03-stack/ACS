const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuery() {
  const installationId = '2a594829-0926-4103-846f-9182e5f41abe';
  const { data, error } = await supabase
    .from('installations')
    .select('*, customers (*), vehicles (*), chargers (*), dealer:organizations!dealer_id (name), partner:organizations!partner_id (name), technician:profiles!technician_id (name)')
    .eq('id', installationId)
    .single();

  console.log('Error:', JSON.stringify(error, null, 2));
  console.log('Data exists:', !!data);
}

checkQuery();

