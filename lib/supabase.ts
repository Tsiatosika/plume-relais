import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-url-polyfill/auto'

const SUPABASE_URL = 'https://hklqcjmokmehkczahjyl.supabase.co' 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbHFjam1va21laGtjemFoanlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjkxNjAsImV4cCI6MjA5NjYwNTE2MH0.UVc4d3X3EYVV-dd1nW_t3VP4TOMzrKcV8MNNlsFJXUI'               

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})