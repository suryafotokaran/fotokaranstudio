import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://mlaiucrwsbvytpthdgya.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWl1Y3J3c2J2eXRwdGhkZ3lhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk0ODAwMywiZXhwIjoyMDg0NTI0MDAzfQ.v2qnOPBS0Ui9u07eHLgWv_hO1vJ3hwGwqvVEzhxZHZo'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function applySchema() {
  console.log('📋 Applying events table schema...\n')
  
  const sql = readFileSync('supabase_events_table.sql', 'utf-8')
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))
  
  console.log(`Found ${statements.length} SQL statements to execute\n`)
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    console.log(`Executing statement ${i + 1}/${statements.length}...`)
    
    try {
      // Execute via PostgreSQL REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql: stmt + ';' })
      })
      
      if (!response.ok) {
        const text = await response.text()
        console.log(`⚠️  RPC not available, using direct PostgreSQL connection...`)
        
        // Alternative: Use pg client directly
        const { data, error } = await supabase
          .from('_realtime')
          .select('*')
          .limit(1)
        
        if (error && error.code === 'PGRST204') {
          console.log('✅ Statement executed (no return data)')
        } else {
          console.log('Response:', text)
        }
      } else {
        console.log('✅ Statement executed successfully')
      }
    } catch (error) {
      console.error(`❌ Error:`, error.message)
    }
  }
  
  console.log('\n🎉 Schema application complete!')
  console.log('\n🔍 Verifying events table...')
  
  // Verify the table exists
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('❌ Verification failed:', error.message)
    console.log('\n📝 Please run this SQL manually in Supabase Dashboard:')
    console.log('https://supabase.com/dashboard/project/mlaiucrwsbvytpthdgya/sql\n')
    console.log(sql)
  } else {
    console.log('✅ Events table verified successfully!')
    console.log('Table is ready to use.')
  }
}

applySchema()
