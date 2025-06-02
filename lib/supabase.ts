'use client'

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/supabase-js'

export const supabase: SupabaseClient = createBrowserSupabaseClient()
