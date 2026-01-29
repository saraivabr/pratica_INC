#!/usr/bin/env node

/**
 * Script to sync WhatsApp messages to pipeline_leads table
 * Usage: node scripts/sync-pipeline.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false
});

async function syncPipeline() {
  console.log('🚀 Starting pipeline sync...');
  
  try {
    // First, check if whatsapp_messages table exists and has data
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count FROM whatsapp_messages WHERE tenant_id = 1
    `);
    
    const messageCount = checkResult.rows[0].count;
    console.log(`📱 Found ${messageCount} WhatsApp messages to analyze`);
    
    if (messageCount == 0) {
      console.log('❌ No WhatsApp messages found. Nothing to sync.');
      return;
    }

    // Get aggregated message data
    const whatsappData = await pool.query(`
      WITH message_stats AS (
        SELECT 
          wm.phone_number,
          MAX(wm.contact_name) as contact_name,
          COUNT(*) as total_messages,
          MAX(wm.timestamp) as last_message_at,
          (SELECT wm2.message_text FROM whatsapp_messages wm2 WHERE wm2.phone_number = wm.phone_number ORDER BY wm2.timestamp DESC LIMIT 1) as last_message_text,
          (SELECT wm2.is_from_me FROM whatsapp_messages wm2 WHERE wm2.phone_number = wm.phone_number ORDER BY wm2.timestamp DESC LIMIT 1) as last_message_from_me,
          EXTRACT(EPOCH FROM NOW() - MAX(wm.timestamp)) as seconds_since_last_message
        FROM whatsapp_messages wm
        WHERE wm.tenant_id = 1
        GROUP BY wm.phone_number
      )
      SELECT *,
        CASE 
          WHEN total_messages <= 2 THEN 'new'
          WHEN seconds_since_last_message > 259200 THEN 'cold' -- 3+ days
          WHEN last_message_from_me = true AND seconds_since_last_message > 3600 THEN 'waiting' -- 1+ hour
          WHEN seconds_since_last_message < 86400 THEN 'active' -- < 1 day
          ELSE 'waiting'
        END as suggested_stage
      FROM message_stats
      ORDER BY last_message_at DESC
    `);

    console.log(`🎯 Processing ${whatsappData.rows.length} unique contacts...`);

    let inserted = 0;
    let updated = 0;

    // Insert/update each lead
    for (const row of whatsappData.rows) {
      const result = await pool.query(`
        INSERT INTO pipeline_leads (
          phone_number, contact_name, stage, temperature, 
          last_message_at, last_message_text, last_message_from_me,
          total_messages, tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (phone_number, tenant_id) 
        DO UPDATE SET
          contact_name = EXCLUDED.contact_name,
          stage = EXCLUDED.stage,
          last_message_at = EXCLUDED.last_message_at,
          last_message_text = EXCLUDED.last_message_text,
          last_message_from_me = EXCLUDED.last_message_from_me,
          total_messages = EXCLUDED.total_messages,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [
        row.phone_number,
        row.contact_name || 'Sem nome',
        row.suggested_stage,
        'warm',
        row.last_message_at,
        row.last_message_text,
        row.last_message_from_me,
        row.total_messages,
        1 // tenant_id
      ]);

      if (result.rows[0]?.inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    // Show stats by stage
    const stageStats = await pool.query(`
      SELECT stage, COUNT(*) as count 
      FROM pipeline_leads 
      WHERE tenant_id = 1 
      GROUP BY stage 
      ORDER BY count DESC
    `);

    console.log('\n📊 Pipeline Stats:');
    stageStats.rows.forEach(stat => {
      const stageNames = {
        new: '🔔 Acabou de chegar!',
        waiting: '⏳ Esperando responder...',
        active: '🔥 Conversa rolando!',
        objection: '💪 Quebrando objeção',
        visit: '📅 Visita marcada!',
        proposal: '📝 Proposta na mesa',
        closed: '🎉 Fechou!',
        cold: '😴 Esfriou...'
      };
      const displayName = stageNames[stat.stage] || stat.stage;
      console.log(`  ${displayName}: ${stat.count} leads`);
    });

    console.log(`\n✅ Sync complete!`);
    console.log(`   📝 Inserted: ${inserted} new leads`);
    console.log(`   🔄 Updated: ${updated} existing leads`);
    console.log(`   📱 Total pipeline leads: ${inserted + updated}`);
    console.log('\n🎯 Access your pipeline at: /corretor/pipeline');

  } catch (error) {
    console.error('❌ Error syncing pipeline:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncPipeline()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { syncPipeline };