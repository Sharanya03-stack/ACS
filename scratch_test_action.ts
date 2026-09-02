import { uploadEvidence } from './src/app/actions/uploadEvidence';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// mock formData
const formData = new FormData();
formData.append('installationId', '2a594829-0926-4103-846f-9182e5f41abe');
formData.append('category', 'Extra_Installation_Photo');
const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
formData.append('file', file);

async function run() {
  try {
    const res = await uploadEvidence(formData);
    console.log(res);
  } catch (err) {
    console.error("Caught error:", err);
  }
}
run();
