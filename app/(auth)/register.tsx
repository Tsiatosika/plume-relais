import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert
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
    if (!email || !password || !pseudo) {
      Alert.alert('Erreur', 'Remplis tous les champs')
      return
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Mot de passe trop court — minimum 6 caractères')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      Alert.alert('Erreur', error.message)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, pseudo })
      if (profileError) {
        setLoading(false)
        Alert.alert('Erreur', 'Erreur profil : ' + profileError.message)
        return
      }
    }
    setLoading(false)
    Alert.alert('Succès', 'Compte créé ! Tu peux maintenant te connecter.')
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
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Créer mon compte</Text>
        }
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