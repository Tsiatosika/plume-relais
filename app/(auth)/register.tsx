import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()

  const handleRegister = async () => {
    if (!email || !password || !pseudo) {
      window.alert('Remplis tous les champs')
      return
    }
    if (password.length < 6) {
      window.alert('Mot de passe trop court — minimum 6 caractères')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      window.alert('Erreur : ' + error.message)
      return
    }
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles').insert({ id: data.user.id, pseudo })
      if (profileError) {
        setLoading(false)
        window.alert('Erreur profil : ' + profileError.message)
        return
      }
    }
    setLoading(false)
    window.alert('Compte créé ! Tu peux maintenant te connecter.')
    router.replace('/(auth)/login')
  }

  const fields = [
    {
      key: 'pseudo', label: 'Ton pseudo', placeholder: 'Ex: Écrivain_fou',
      value: pseudo, onChange: setPseudo, secure: false, icon: 'at-outline' as const,
    },
    {
      key: 'email', label: 'Adresse email', placeholder: 'ton@email.com',
      value: email, onChange: setEmail, secure: false, icon: 'mail-outline' as const,
      keyboard: 'email-address' as any,
    },
    {
      key: 'password', label: 'Mot de passe', placeholder: '6 caractères minimum',
      value: password, onChange: setPassword, secure: true, icon: 'lock-closed-outline' as const,
    },
  ]

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="pencil" size={28} color="#FDFCFF" style={{ transform: [{ rotate: '-45deg' }] }} />
          </View>
          <Text style={styles.title}>Rejoins l'aventure</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>
            Crée ton compte et commence à écrire
          </Text>
        </View>

        <View style={styles.form}>
          {fields.map(field => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={[
                styles.inputWrap,
                focusedField === field.key && styles.inputWrapFocused
              ]}>
                <Ionicons
                  name={field.icon}
                  size={18}
                  color={focusedField === field.key ? '#5B4FCF' : '#B8AED8'}
                />
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor="#C4B8E8"
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry={field.secure && !showPassword}
                  autoCapitalize="none"
                  keyboardType={field.keyboard ?? 'default'}
                  onFocus={() => setFocusedField(field.key)}
                  onBlur={() => setFocusedField(null)}
                />
                {field.secure && (
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18} color="#B8AED8"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Text style={styles.btnText}>Créer mon compte</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={16} color="#5B4FCF" />
          <Text style={styles.backBtnText}>
            Déjà un compte ? Se connecter
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  scroll: {
    paddingHorizontal: 28, paddingVertical: 40,
    justifyContent: 'center', flexGrow: 1,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 76, height: 76, borderRadius: 26,
    backgroundColor: '#5B4FCF', alignItems: 'center',
    justifyContent: 'center', marginBottom: 18,
    shadowColor: '#5B4FCF', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32, shadowRadius: 20, elevation: 8,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 28, fontWeight: '700', color: '#1A1033',
    letterSpacing: -0.5, marginBottom: 8,
  },
  titleRule: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: '#D6CDF5', marginBottom: 12,
  },
  subtitle: {
    fontSize: 15, color: '#7B6FA0',
    textAlign: 'center', lineHeight: 22,
  },
  form: {
    backgroundColor: '#fff', borderRadius: 26, padding: 24,
    borderWidth: 1, borderColor: '#F0ECF8',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07, shadowRadius: 24, elevation: 4,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 12.5, fontWeight: '700', color: '#4A3F72',
    marginBottom: 8, letterSpacing: 0.4, textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E8E4F8', borderRadius: 15,
    paddingHorizontal: 14, backgroundColor: '#FAFAFE',
  },
  inputWrapFocused: { borderColor: '#5B4FCF', backgroundColor: '#fff' },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1A1033' },
  btn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#5B4FCF', padding: 16, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: '#5B4FCF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 24,
  },
  backBtnText: { color: '#5B4FCF', fontSize: 14, fontWeight: '600' },
})