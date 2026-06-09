import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function RootLayout() {
  const { user, setUser, setProfile } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (data) setProfile(data)
        }
      }
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) router.replace('/(auth)/login')
    if (user && inAuth) router.replace('/(app)/feed')
  }, [user, segments])

  return <Slot />
}