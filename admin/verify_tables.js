import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// Specifically load from .env.local if .env doesn't exist
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL or Key missing in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
    console.log(`Testing connection to ${supabaseUrl}...`)

    const tables = ['events', 'clients']

    for (const table of tables) {
        console.log(`\nChecking table: ${table}...`)
        const { data, error } = await supabase.from(table).select('count').limit(1)

        if (error) {
            console.error(`❌ ${table} verification failed:`, error.message)
            if (error.message.includes('relation "public.' + table + '" does not exist')) {
                console.error(`   -> Table "${table}" DOES NOT EXIST in public schema.`)
            }
        } else {
            console.log(`✅ ${table} table exists and is accessible!`)
            console.log(`   Sample data (count):`, data)
        }
    }
}

verify()
