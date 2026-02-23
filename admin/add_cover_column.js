import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function run() {
    console.log('🚀 Attempting to add cover_image_url column to website_categories...')

    const sql = `ALTER TABLE website_categories ADD COLUMN IF NOT EXISTS cover_image_url TEXT;`

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({ query: sql })
        })

        if (response.ok) {
            console.log('✅ Success! Column added and schema cache should refresh.')
            return
        }

        const errorText = await response.text()
        console.warn('⚠️ SQL execution via rpc/query failed. This usually means the "query" function is not defined in your Supabase project.')

        // Retrying with common alternative names
        const alternatives = ['exec', 'execute_sql', 'run_sql']
        for (const alt of alternatives) {
            console.log(`Trying alternative RPC: rpc/${alt}...`)
            const altResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${alt}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                },
                body: JSON.stringify({ sql })
            })
            if (altResp.ok) {
                console.log(`✅ Success with rpc/${alt}!`)
                return
            }
        }

        console.error('\n❌ Could not apply migration automatically.')
        console.log('\n💡 PLEASE RUN THIS SQL MANUALLY IN YOUR SUPABASE DASHBOARD (SQL EDITOR):')
        console.log('------------------------------------------------------------')
        console.log(sql)
        console.log('------------------------------------------------------------')
        console.log('\nDocumentation: After running the SQL, Supabase might take a few minutes to refresh the schema cache.')

    } catch (err) {
        console.error('❌ Connection error:', err.message)
    }
}

run()
