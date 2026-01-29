import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { dbQuery } from './db-cli';

async function main() {
  console.log("Checking latest sync logs...");
  try {
    const { rows } = await dbQuery("SELECT agent_name, status, total_items, errors, error_details FROM sync_logs ORDER BY started_at DESC LIMIT 1;");
    if (rows.length > 0) {
        console.log("Latest Log:", JSON.stringify(rows[0], null, 2));
    } else {
        console.log("No logs found.");
    }
  } catch (error) {
    console.error("❌ Error checking logs:", error);
  }
}

main().then(() => process.exit(0));
