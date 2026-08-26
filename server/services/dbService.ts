import { createClient } from '@supabase/supabase-js'

export const getSupabaseClient = (authHeader: string | undefined) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase server configuration is missing.')

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
    }
  })
}

export interface ProfileDetails {
  id: number
  user_id: string
  name: string | null
  education: string | null
  branch: string | null
  graduation_year: string | null
  experience: string | null
  location: string | null
}

export const dbService = {
  async getUserAndProfile(authHeader: string | undefined): Promise<{ userId: string; profile: ProfileDetails }> {
    if (!authHeader) throw new Error('Authorization header is missing.')
    
    const supabase = getSupabaseClient(authHeader)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      throw new Error(userError?.message || 'Invalid user session.')
    }

    const userId = userData.user.id

    // Fetch profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (profileError) {
      console.error('getUserAndProfile database fetch error:', profileError)
    }

    // Auto-create profile if missing
    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: userId })
        .select('*')
        .single()

      if (insertError) {
        throw new Error(`Failed to create user profile: ${insertError.message}`)
      }
      profile = newProfile
    }

    return { userId, profile: profile as ProfileDetails }
  }
}
