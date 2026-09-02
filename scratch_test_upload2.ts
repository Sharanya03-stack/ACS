import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@acsenergy.com',
    password: 'password123'
  });
  
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  console.log("Authenticated as:", authData.user?.id);
  
  const file = new Blob(['test image data'], { type: 'image/png' });
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.log("Attempting storage upload...");
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('installation-evidence')
    .upload(`2a594829-0926-4103-846f-9182e5f41abe/test-image.png`, buffer, { upsert: true, contentType: 'image/png' });
    
  if (uploadError) {
    console.error("Storage upload error:", uploadError);
  } else {
    console.log("Storage upload success:", uploadData);
  }
  
  console.log("Attempting DB insert...");
  const { data: dbData, error: dbError } = await supabase
    .from('installation_photos')
    .insert({
      installation_id: '2a594829-0926-4103-846f-9182e5f41abe',
      uploaded_by: authData.user?.id,
      category: 'Extra_Installation_Photo',
      storage_path: `2a594829-0926-4103-846f-9182e5f41abe/test-image.png`,
      file_type: 'image/png',
      file_size: file.size
    });
    
  if (dbError) {
    console.error("DB insert error:", dbError);
  } else {
    console.log("DB insert success:", dbData);
  }
}

run();
