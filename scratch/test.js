const { createCharger } = require('./src/app/actions/entityActions');
// I can't easily run a server action in a naked Node script because of Next.js imports like `cookies()`.

// I'll just check if the code works by doing the same thing via direct Supabase client.
