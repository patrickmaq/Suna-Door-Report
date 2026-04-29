import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fjpznxzycfywdgnyhzgz.supabase.co'
const supabaseKey = 'sb_publishable_RsdTTX25B5W4l09mSGwoAw_a2aTC6Rq'

export const supabase = createClient(supabaseUrl, supabaseKey)