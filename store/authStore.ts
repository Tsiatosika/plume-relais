import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

type AuthState = {
  user: any | null
  profile: Profile | null
  setUser: (user: any) => void
  setProfile: (profile: Profile) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))