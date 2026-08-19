import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("Starting DB Seeding...");

  // 1. Create Organizations
  const orgs = [
    { type: 'ACS', name: 'ACS Energy (Admin)' },
    { type: 'OEM', name: 'Tata Motors' },
    { type: 'OEM', name: 'MG Motor' },
    { type: 'PARTNER', name: 'VoltCharge Partners' }
  ];

  console.log("Creating top-level organizations...");
  const { data: createdOrgs, error: orgError } = await supabase
    .from('organizations')
    .insert(orgs)
    .select();

  if (orgError) {
    console.error("Error creating orgs:", orgError);
    return;
  }

  const acsOrg = createdOrgs.find(o => o.name === 'ACS Energy (Admin)');
  const tataOrg = createdOrgs.find(o => o.name === 'Tata Motors');
  const mgOrg = createdOrgs.find(o => o.name === 'MG Motor');
  const partnerOrg = createdOrgs.find(o => o.name === 'VoltCharge Partners');

  console.log("Creating dealerships...");
  const dealers = [
    { type: 'DEALER', name: 'Tata Dealership Pune', parent_org_id: tataOrg.id },
    { type: 'DEALER', name: 'MG Dealership Mumbai', parent_org_id: mgOrg.id }
  ];

  const { data: createdDealers, error: dealerError } = await supabase
    .from('organizations')
    .insert(dealers)
    .select();

  if (dealerError) {
    console.error("Error creating dealers:", dealerError);
    return;
  }

  const tataDealer = createdDealers.find(o => o.name === 'Tata Dealership Pune');
  const mgDealer = createdDealers.find(o => o.name === 'MG Dealership Mumbai');

  console.log("Cleaning up old auth users via SQL...");
  console.log("Cleaning up old auth users via Supabase API...");
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (usersData && usersData.users) {
    const emailsToDelete = ['admin@acsenergy.com', 'oem@tata.com', 'oem@mg.com', 'dealer@tata.com', 'dealer@mg.com', 'partner@voltcharge.com', 'tech@voltcharge.com'];
    for (const u of usersData.users) {
      if (u.email && emailsToDelete.includes(u.email)) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
  }

  // 2. Create Users
  console.log("Creating auth users and profiles...");
  
  const usersToCreate = [
    { email: 'admin@acsenergy.com', role: 'ACS_ADMIN', orgId: null, name: 'Admin User' },
    { email: 'oem@tata.com', role: 'OEM', orgId: tataOrg?.id, name: 'Tata Admin' },
    { email: 'oem@mg.com', role: 'OEM', orgId: mgOrg?.id, name: 'MG Admin' },
    { email: 'dealer@tata.com', role: 'DEALER', orgId: tataDealer?.id, name: 'Tata Pune Dealer' },
    { email: 'dealer@mg.com', role: 'DEALER', orgId: mgDealer?.id, name: 'MG Mumbai Dealer' },
    { email: 'partner@voltcharge.com', role: 'PARTNER', orgId: partnerOrg?.id, name: 'VoltCharge Manager' },
    { email: 'tech@voltcharge.com', role: 'TECHNICIAN', orgId: partnerOrg?.id, name: 'VoltCharge Tech 1' },
  ];

  for (const u of usersToCreate) {
    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
      attempts++;
      try {
        let authUserId: string | undefined;

        const { data: user, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: 'password123',
          email_confirm: true,
        });

        if (error) {
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
          if (listError) throw listError;
          
          const users: any[] = (listData as any)?.users || [];
          const existingUser = users.find(usr => usr.email === u.email);
          
          if (existingUser) {
            authUserId = existingUser.id;
          } else {
            throw error;
          }
        } else if (user && user.user) {
          authUserId = user.user.id;
        }

        if (authUserId) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: authUserId,
            role: u.role,
            org_id: u.orgId,
            name: u.name,
            phone: '555-0000',
            status: 'ACTIVE'
          });
          if (profileError) throw profileError;
        }
        
        console.log(`Processed user and profile: ${u.email}`);
        success = true;
      } catch (error: any) {
        console.error(`Attempt ${attempts} failed for ${u.email}:`, error.message);
        if (attempts === 3) console.error(`Final failure creating user ${u.email}`);
        else await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  console.log("Seeding complete!");
}

main().catch(console.error);
