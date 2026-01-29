import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { dbQuery } from './db-cli';

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Please provide a SQL query as an argument.");
    process.exit(1);
  }

  console.log(`Executing: ${query}`);
  try {
    const result = await dbQuery(query);
    console.log("✅ Success.");
    console.log("Result:", result.rows);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
  }
}

main().then(() => process.exit(0));
