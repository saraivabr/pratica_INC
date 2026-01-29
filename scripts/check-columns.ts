import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { dbQuery } from './db-cli';

async function main() {
  console.log("Checking columns for cvcrm_leads...");
  try {
    const { rows } = await dbQuery("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cvcrm_leads';");
    console.log(`Found ${rows.length} columns:`);
    rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
  } catch (error) {
    console.error("❌ Error checking columns:", error);
  }
}

main().then(() => process.exit(0));
