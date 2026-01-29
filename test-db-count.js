// Test database connection and count
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    const result = await pool.query("SELECT COUNT(*) as total FROM cvcrm_leads");
    console.log("Total leads:", result.rows[0].total);
    
    const recent = await pool.query("SELECT idlead, nome FROM cvcrm_leads ORDER BY synced_at DESC LIMIT 5");
    console.log("\nRecent leads:");
    recent.rows.forEach(r => console.log(`- ${r.idlead}: ${r.nome}`));
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

test();
