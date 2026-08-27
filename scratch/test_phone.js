function isValidPhone(phone) {
  if (!phone || phone.trim() === '') return true;
  const trimmed = phone.trim();
  return /^[6-9][0-9]{9}$/.test(trimmed);
}

const tests = [
  "9876543210", // valid
  "9123456789", // valid
  "987654321", // invalid (9 digits)
  "98765432101", // invalid (11 digits)
  "5123456789", // invalid (starts with 5)
  "98765abc10", // invalid (letters)
  "+919876543210", // invalid (starts with +91)
  "98765 43210", // invalid (space)
  " 9876543210 ", // valid (spaces at ends are trimmed)
];

tests.forEach(t => {
  console.log(`${t}: ${isValidPhone(t)}`);
});
