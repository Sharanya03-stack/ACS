const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/admin/organizations/actions.ts', 'utf8');
if (!content.includes("isValidPhone")) {
  content = content.replace(/import \{ revalidatePath \} from 'next\/cache';/g, "import { revalidatePath } from 'next/cache';\nimport { isValidPhone } from '@/utils/validation';");
}

const functions = ['createOEM', 'updateOEM', 'createDealer', 'updateDealer', 'createPartner', 'updatePartner'];
functions.forEach(func => {
  const regex = new RegExp(`(export async function ${func}\\(.*?\\) \\{[\\s\\S]*?const contactPhone = formData.get\\('contactPhone'\\) as string;)`);
  if (!content.includes(`if (contactPhone && !isValidPhone(contactPhone))`)) {
    content = content.replace(regex, "$1\n\n    if (contactPhone && !isValidPhone(contactPhone)) {\n      return { error: 'Invalid contact phone number format' };\n    }");
  }
});
fs.writeFileSync('src/app/(dashboard)/admin/organizations/actions.ts', content);
