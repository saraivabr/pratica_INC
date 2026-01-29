import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { dbQuery } from './db-cli';

async function main() {
  console.log("Adding cvcrm_id column to users table...");
  try {
    await dbQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS cvcrm_id INTEGER UNIQUE;");
    console.log("✅ Column added successfully (or already existed).");
  } catch (error) {
    console.error("❌ Error adding column:", error);
  }
}

main().then(() => process.exit(0));
