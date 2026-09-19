import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'

// Client for queries
const client = postgres(connectionString, { max: 1 })
export const db = drizzle(client, { schema })
