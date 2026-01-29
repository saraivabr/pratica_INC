import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { dbQuery } from './db-cli';

async function main() {
  console.log("Checking for cvcrm_* tables...");
  try {
    const { rows } = await dbQuery("SELECT tablename FROM pg_catalog.pg_tables WHERE tablename LIKE 'cvcrm_%';");
    console.log(`Found ${rows.length} tables:`);
    rows.forEach(r => console.log(` - ${r.tablename}`));
  } catch (error) {
    console.error("❌ Error checking tables:", error);
  }
}

main().then(() => process.exit(0));
