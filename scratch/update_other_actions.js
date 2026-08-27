const fs = require('fs');

// 1. Partner Technicians
let techContent = fs.readFileSync('src/app/(dashboard)/partner/technicians/actions.ts', 'utf8');
if (!techContent.includes("isValidPhone")) {
  techContent = techContent.replace(/import \{ revalidatePath \} from 'next\/cache';/g, "import { revalidatePath } from 'next/cache';\nimport { isValidPhone } from '@/utils/validation';");
}
['createTechnician', 'updateTechnician'].forEach(func => {
  const regex = new RegExp(`(export async function ${func}\\(.*?\\) \\{[\\s\\S]*?const phone = formData.get\\('phone'\\) as string;)`);
  if (!techContent.includes(`if (phone && !isValidPhone(phone))`)) {
    techContent = techContent.replace(regex, "$1\n\n    if (phone && !isValidPhone(phone)) {\n      return { error: 'Invalid phone number format' };\n    }");
  }
});
fs.writeFileSync('src/app/(dashboard)/partner/technicians/actions.ts', techContent);


// 2. Dealer Sales
let salesContent = fs.readFileSync('src/app/(dashboard)/dealer/sales/actions.ts', 'utf8');
if (!salesContent.includes("isValidPhone")) {
  salesContent = salesContent.replace(/import \{ revalidatePath \} from 'next\/cache';/g, "import { revalidatePath } from 'next/cache';\nimport { isValidPhone } from '@/utils/validation';");
}
if (!salesContent.includes("if (!isValidPhone(customerPhone))")) {
  salesContent = salesContent.replace(
    /(const customerPhone = formData\.get\('customerPhone'\) as string;)/,
    "$1\n\n    if (!isValidPhone(customerPhone)) {\n      return { error: 'Invalid customer phone number format' };\n    }"
  );
}
fs.writeFileSync('src/app/(dashboard)/dealer/sales/actions.ts', salesContent);
