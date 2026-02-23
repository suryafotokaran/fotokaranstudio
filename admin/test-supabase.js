import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mlaiucrwsbvytpthdgya.supabase.co'
const supabaseKey = 'sb_publishable_19f5K2imY5eMTzr5_egQbw_AM6-IJ1Z'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('Creating events table...')
  
  // Note: This requires service_role key for DDL operations
  // The publishable key can only do DML (insert, select, update, delete)
  // So we'll use the Supabase Management API or SQL Editor instead
  
  const sqlQuery = `
-- Create the events table
create table if not exists events (
  id bigint primary key generated always as identity,
  wedding_name text not null,
  date text not null,
  categories text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table events enable row level security;

-- Create policy to allow authenticated users to read all events
create policy if not exists "Authenticated users can read events"
on public.events
for select to authenticated
using (true);

-- Create policy to allow authenticated users to insert events
create policy if not exists "Authenticated users can insert events"
on public.events
for insert to authenticated
with check (true);

-- Create policy to allow authenticated users to update events
create policy if not exists "Authenticated users can update events"
on public.events
for update to authenticated
using (true);

-- Create policy to allow authenticated users to delete events
create policy if not exists "Authenticated users can delete events"
on public.events
for delete to authenticated
using (true);
`
  
  console.log('SQL Query to run in Supabase SQL Editor:')
  console.log(sqlQuery)
  
  // Test connection
  console.log('\nTesting connection...')
  const { data, error } = await supabase.from('events').select('count')
  
  if (error) {
    console.error('Error:', error.message)
    if (error.message.includes('relation "public.events" does not exist')) {
      console.log('\n⚠️  Events table does not exist yet.')
      console.log('Please run the SQL query above in your Supabase SQL Editor.')
    }
  } else {
    console.log('✅ Connection successful! Events table exists.')
    console.log('Data:', data)
  }
}

setupDatabase()
