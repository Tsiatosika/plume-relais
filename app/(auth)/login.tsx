import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async () => {
    if (!email || !password) {
      window.alert('Remplis tous les champs')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) window.alert('Erreur : ' + error.message)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header décoratif */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoInk} />
          <Ionicons name="pencil" size={28} color="#FDFCFF" style={styles.logoIcon} />
        </View>
        <Text style={styles.title}>Plume Relais</Text>
        <View style={styles.titleRule} />
        <Text style={styles.subtitle}>
          Des histoires écrites à plusieurs mains
        </Text>
      </View>

      {/* Formulaire */}
      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Adresse email</Text>
          <View style={[
            styles.inputWrap,
            focusedField === 'email' && styles.inputWrapFocused
          ]}>
            <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? '#5B4FCF' : '#B8AED8'} />
            <TextInput
              style={styles.input}
              placeholder="ton@email.com"
              placeholderTextColor="#C4B8E8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={[
            styles.inputWrap,
            focusedField === 'password' && styles.inputWrapFocused
          ]}>
            <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? '#5B4FCF' : '#B8AED8'} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#C4B8E8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18} color="#B8AED8"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </Text>
          {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Ionicons name="sparkles-outline" size={14} color="#9B8EC4" />
        <Text style={styles.footer}>Chaque histoire commence par un mot</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FF',
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 76, height: 76, borderRadius: 26,
    backgroundColor: '#5B4FCF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#5B4FCF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
  logoInk: {
    position: 'absolute',
    width: 76, height: 76, borderRadius: 26,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
  },
  logoIcon: { transform: [{ rotate: '-45deg' }] },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 32, fontWeight: '700',
    color: '#1A1033', letterSpacing: -0.5,
    marginBottom: 8,
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
    backgroundColor: '#fff',
    borderRadius: 26, padding: 24,
    borderWidth: 1, borderColor: '#F0ECF8',
    shadowColor: '#1A1033',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 4,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 12.5, fontWeight: '700',
    color: '#4A3F72', marginBottom: 8,
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E8E4F8',
    borderRadius: 15, paddingHorizontal: 14,
    backgroundColor: '#FAFAFE',
  },
  inputWrapFocused: {
    borderColor: '#5B4FCF',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1, paddingVertical: 14,
    fontSize: 15, color: '#1A1033',
  },
  btn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#5B4FCF',
    padding: 16, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: '#5B4FCF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#fff', fontWeight: '700',
    fontSize: 16, letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1, height: 1, backgroundColor: '#EDE9F8',
  },
  dividerText: {
    marginHorizontal: 12, fontSize: 12.5,
    color: '#9B8EC4', fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1.5, borderColor: '#5B4FCF',
    padding: 15, borderRadius: 15,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#5B4FCF', fontWeight: '700', fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 32,
  },
  footer: {
    fontSize: 13, color: '#9B8EC4',
  },
})