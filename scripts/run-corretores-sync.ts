import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock server-only for CLI
import { syncCorretoresMapping } from '../lib/sync/sync-corretores';

async function main() {
  try {
    const result = await syncCorretoresMapping();
    console.log("Result:", result);
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

main().then(() => process.exit(0));
