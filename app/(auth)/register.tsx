import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    if (!email || !password || !pseudo)
      return Alert.alert('Remplis tous les champs')
    if (password.length < 6)
      return Alert.alert('Mot de passe trop court', 'Minimum 6 caractères')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      return Alert.alert('Erreur', error.message)
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, pseudo })
      if (profileError) {
        setLoading(false)
        return Alert.alert('Erreur profil', profileError.message)
      }
    }
    setLoading(false)
    Alert.alert('Compte créé !', 'Tu peux maintenant te connecter.')
    router.replace('/(auth)/login')
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>✒️ Créer un compte</Text>

      <TextInput
        style={styles.input}
        placeholder="Pseudo"
        value={pseudo}
        onChangeText={setPseudo}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe (min. 6 caractères)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? 'Création...' : 'Créer mon compte'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, padding: 28, justifyContent: 'center', backgroundColor: '#fff'
  },
  title: {
    fontSize: 28, fontWeight: '700', textAlign: 'center',
    color: '#7F77DD', marginBottom: 40
  },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 14, marginBottom: 14, fontSize: 15, backgroundColor: '#FAFAFA'
  },
  btn: {
    backgroundColor: '#7F77DD', padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 4
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', marginTop: 20, color: '#7F77DD', fontSize: 14 },
})