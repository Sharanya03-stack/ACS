const { createCharger } = require('./src/app/actions/entityActions');

// We can't easily mock the server action environment without Next.js context (cookies, etc.)
// Let's write a fast Next.js script to test it instead.
