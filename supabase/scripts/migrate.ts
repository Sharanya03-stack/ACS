import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL in .env.local");
    process.exit(1);
  }

  // Handle common mistake of leaving brackets [password]
  if (connectionString.includes(':[') && connectionString.includes(']@')) {
    console.log("Removing brackets from password in connection string...");
    connectionString = connectionString.replace(':[', ':').replace(']@', '@');
  }

  // To handle special characters in password without URL encoding, let's parse it out
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = connectionString.match(regex);
  let client;

  if (match) {
    const [, user, password, host, port, database] = match;
    client = new Client({
      user,
      password: decodeURIComponent(password), // in case it is URL encoded
      host,
      port: parseInt(port),
      database,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }

  try {
    await client.connect();
    console.log("Connected to PostgreSQL.");

    const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir)
                    .filter(f => f.endsWith('.sql'))
                    .sort();
    
    for (const file of files) {
      console.log(`Executing ${file}...`);
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log(`${file} executed successfully!`);
    }
    
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

main();
