import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: 'oem@tata.com', password: 'password123' });
  if (error) throw error;
  
  const { data: me } = await client.auth.getUser();
  console.log("Logged in UID:", me.user?.id);

  // direct call to get_auth_role if we can, or just select from profiles
  const { data: pData, error: pErr } = await client.from('profiles').select('*').eq('id', me.user?.id);
  console.log("Profile from select:", pData, pErr);

  const { data: inst, error: iErr } = await client.from('installations').select('*');
  console.log("Installations seen:", inst?.length, "Error:", iErr);

  const { data: orgId, error: orgErr } = await client.rpc('get_auth_org_id');
  console.log("RPC get_auth_org_id:", orgId, orgErr);
  const { data: role, error: roleErr } = await client.rpc('get_auth_role');
  console.log("RPC get_auth_role:", role, roleErr);
}

main().catch(console.error);
