import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tmvntnwcdtqqeeeskfzo.supabase.co'
const supabaseKey = 'sb_publishable_jw7u64_nwSbLU2BOsmhfCw_SKfTnijR'

export const supabase = createClient(supabaseUrl, supabaseKey)
