#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import 'dotenv/config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mlaiucrwsbvytpthdgya.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQL(sql) {
  console.log('🔄 Executing SQL...\n')
  
  // Use Supabase's REST API to execute raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SQL execution failed: ${error}`)
  }

  return await response.json()
}

async function applySchema(sqlFile) {
  try {
    console.log(`📋 Reading schema: ${sqlFile}\n`)
    const sql = readFileSync(sqlFile, 'utf-8')
    
    console.log('📝 SQL to execute:')
    console.log('─'.repeat(70))
    console.log(sql)
    console.log('─'.repeat(70))
    console.log()
    
    const result = await executeSQL(sql)
    
    console.log('✅ Schema applied successfully!')
    console.log('Result:', result)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

const sqlFile = process.argv[2] || 'supabase_events_table.sql'
applySchema(sqlFile)
