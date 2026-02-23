import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL or Service Key missing in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearData() {
    console.log('🧹 Clearing all data from tables...')

    const tables = [
        'event_images',
        'client_event_access',
        'events',
        'clients',
        'client_users'
    ]

    for (const table of tables) {
        console.log(`Clearing ${table}...`)
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000') // Trick to delete all

        // If id is bigint (like in events), we use a different check
        if (error && error.message.includes('invalid input syntax for type bigint')) {
            await supabase.from(table).delete().gt('id', 0)
        } else if (error) {
            console.error(`❌ Error clearing ${table}:`, error.message)
        } else {
            console.log(`✅ ${table} cleared.`)
        }
    }

    console.log('\n✨ All tables cleared successfully.')
}

clearData()
