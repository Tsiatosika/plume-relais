import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import { useRouter } from 'expo-router'

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
    try {
      console.log('🔓 Déconnexion en cours...')
      
      // Déconnexion de Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Erreur déconnexion:', error)
        return
      }
      
      console.log('✅ Déconnecté avec succès')
      
      // Réinitialiser l'état
      set({ user: null, profile: null })
            
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error)
    }
  },
}))