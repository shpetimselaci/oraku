import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import { createClient } from '@supabase/supabase-js'

const url = process.env.PROJECT_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url) throw new Error('PROJECT_URL not set in environment')
if (!key) throw new Error('SUPABASE_SERVICE_KEY not set in environment')

export const supabase = createClient(url, key, {
  auth: { persistSession: false }
})
