import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgres://postgres:356d20e7786bbbe6f375@84.247.128.56:3005/pratica?sslmode=disable';

async function seedLeads() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('Connected for seeding...');

    // Get Funnel and Stages
    const funnelRes = await client.query("SELECT id FROM funnels WHERE name = 'Funil de Vendas Padrão' LIMIT 1");
    const funnelId = funnelRes.rows[0]?.id;
    
    if (!funnelId) throw new Error("Funnel not found");

    const stagesRes = await client.query("SELECT id, name FROM funnel_stages WHERE funnel_id = $1 ORDER BY position", [funnelId]);
    const stages = stagesRes.rows;

    const leads = [
      { name: "Ricardo Almeida", phone: "5511988887777", score: 85, temp: "hot", stage: "Contato Realizado" },
      { name: "Juliana Santos", phone: "5511977776666", score: 45, temp: "warm", stage: "Novo Lead" },
      { name: "Marcos Oliveira", phone: "5511966665555", score: 92, temp: "hot", stage: "Em Negociação" },
      { name: "Fernanda Lima", phone: "5511955554444", score: 10, temp: "cold", stage: "Novo Lead" },
      { name: "Bruno Costa", phone: "5511944443333", score: 65, temp: "warm", stage: "Visitando" },
      { name: "Amanda Rocha", phone: "5511933332222", score: 98, temp: "hot", stage: "Fechado Ganho" }
    ];

    for (const lead of leads) {
      const stage = stages.find(s => s.name === lead.stage);
      if (!stage) continue;

      await client.query(
        `INSERT INTO leads (name, phone, funnel_id, stage_id, score, temperature, last_interaction_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT DO NOTHING`,
        [lead.name, lead.phone, funnelId, stage.id, lead.score, lead.temp]
      );
    }

    console.log('✅ Seeding completed!');
  } catch (error) {
    console.error('Seed Error:', error);
  } finally {
    await client.end();
  }
}

seedLeads();
