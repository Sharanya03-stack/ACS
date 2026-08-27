import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(url, serviceKey);

async function runTests() {
  console.log('--- Starting Remote Verification Tests ---');

  // 1. Create Test Users
  console.log('Creating Test User A and Test User B...');
  const userAEmail = `test_user_a_${Date.now()}@test.com`;
  const userBEmail = `test_user_b_${Date.now()}@test.com`;
  const password = 'TestPassword123!';

  const { data: userA, error: errA } = await adminClient.auth.admin.createUser({
    email: userAEmail,
    password: password,
    email_confirm: true
  });
  const { data: userB, error: errB } = await adminClient.auth.admin.createUser({
    email: userBEmail,
    password: password,
    email_confirm: true
  });

  if (errA || errB) {
    console.error('Failed to create test users.', errA, errB);
    return;
  }

  const userIdA = userA.user.id;
  const userIdB = userB.user.id;
  console.log(`Test Users Created. A: ${userIdA}, B: ${userIdB}`);

  // Create profiles for them so the foreign key doesn't fail
  await adminClient.from('profiles').insert([
    { id: userIdA, role: 'TECHNICIAN' },
    { id: userIdB, role: 'TECHNICIAN' }
  ]);

  // Sign in clients
  const clientA = createClient(url, anonKey);
  await clientA.auth.signInWithPassword({ email: userAEmail, password });
  
  const clientB = createClient(url, anonKey);
  await clientB.auth.signInWithPassword({ email: userBEmail, password });

  // Test 1: Service-role INSERT
  console.log('TEST 1: Service-role INSERT into public.notifications');
  const { data: inserted, error: insertError } = await adminClient
    .from('notifications')
    .insert({
      user_id: userIdA,
      title: 'Verification Test',
      message: 'This is a test notification for User A.',
      entity_type: 'test',
    })
    .select()
    .single();

  if (insertError) {
    console.error('FAIL TEST 1:', insertError);
  } else {
    console.log('PASS TEST 1: Inserted notification', inserted.id);
  }

  // Test 2: Authenticated user SELECT of their own notification
  console.log('TEST 2: Auth user SELECT own notification');
  const { data: selectA, error: selectAError } = await clientA
    .from('notifications')
    .select('*')
    .eq('id', inserted.id);

  if (selectAError || !selectA || selectA.length !== 1) {
    console.error('FAIL TEST 2:', selectAError, selectA);
  } else {
    console.log('PASS TEST 2: Found exactly 1 row.');
  }

  // Test 3: Authenticated user cannot SELECT another user's notification
  console.log('TEST 3: Auth user SELECT another user notification');
  const { data: selectB, error: selectBError } = await clientB
    .from('notifications')
    .select('*')
    .eq('id', inserted.id);

  if (selectBError) {
    console.error('FAIL TEST 3 (Unexpected Error):', selectBError);
  } else if (selectB && selectB.length > 0) {
    console.error('FAIL TEST 3: User B could read User A notification!');
  } else {
    console.log('PASS TEST 3: User B returned 0 rows.');
  }

  // Test 5: Authenticated user cannot modify another user's notification
  console.log('TEST 5: Auth user UPDATE another user notification');
  const { data: updateB, error: updateBError } = await clientB
    .from('notifications')
    .update({ is_read: true })
    .eq('id', inserted.id)
    .select();

  if (updateBError) {
    console.error('FAIL TEST 5 (Unexpected Error):', updateBError);
  } else if (updateB && updateB.length > 0) {
    console.error('FAIL TEST 5: User B could modify User A notification!');
  } else {
    console.log('PASS TEST 5: User B returned 0 updated rows.');
  }

  // Test 4: Authenticated user can mark their own notification as read
  console.log('TEST 4: Auth user mark own notification as read');
  const { data: updateA, error: updateAError } = await clientA
    .from('notifications')
    .update({ is_read: true })
    .eq('id', inserted.id)
    .select();

  if (updateAError || !updateA || updateA.length !== 1) {
    console.error('FAIL TEST 4:', updateAError, updateA);
  } else if (updateA[0].is_read !== true) {
    console.error('FAIL TEST 4: Did not update is_read.');
  } else {
    console.log('PASS TEST 4: Successfully marked as read.');
  }

  // Cleanup
  console.log('Cleaning up test users...');
  await adminClient.auth.admin.deleteUser(userIdA);
  await adminClient.auth.admin.deleteUser(userIdB);
  console.log('--- Tests Complete ---');
}

runTests().catch(console.error);
