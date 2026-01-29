// Teste direto do sync sem Next.js
process.env.CVCRM_BASE_URL = "https://pratica.cvcrm.com.br";
process.env.CVCRM_EMAIL = "orcioli@pratica-inc.com.br";
process.env.CVCRM_TOKEN_LEAD = "8899fff8925165bcfb20d35cdc2443a80744692d";
// DATABASE_URL será carregado do .env

async function test() {
  const { leadsCoreAgent } = await import("./lib/sync/agents/01-leads-core.js");
  
  console.log("Testing LeadsCoreAgent.sync()...");
  
  try {
    const result = await leadsCoreAgent.sync(false);
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

test();
