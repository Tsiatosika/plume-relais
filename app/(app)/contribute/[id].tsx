import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Platform
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

export default function Contribute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(1)
  const [context, setContext] = useState('')
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    const loadContext = async () => {
      const { data: paraList } = await supabase
        .from('paragraphs').select('turn_number, content')
        .eq('story_id', id)
        .order('turn_number', { ascending: false })
        .limit(1)
      if (paraList && paraList.length > 0) {
        setCurrentTurn(paraList[0].turn_number + 1)
        setContext(paraList[0].content)
      }
    }
    loadContext()
  }, [id])

  const handleChange = (text: string) => {
    setContent(text)
    setCharCount(text.length)
  }

  const handleSubmit = async () => {
    if (content.trim().length < 20) {
      if (Platform.OS === 'web') window.alert('Écris au moins 20 caractères.')
      return
    }
    setLoading(true)
    const { data: existingList } = await supabase
      .from('proposals').select('id')
      .eq('story_id', id).eq('author_id', user.id)
      .eq('turn_number', currentTurn)

    if (existingList && existingList.length > 0) {
      setLoading(false)
      if (Platform.OS === 'web') window.alert('Tu as déjà une proposition ce tour.')
      return
    }

    const { error } = await supabase.from('proposals').insert({
      story_id: id, author_id: user.id,
      content: content.trim(), turn_number: currentTurn,
    })
    setLoading(false)
    if (error) {
      if (Platform.OS === 'web') window.alert('Erreur : ' + error.message)
      return
    }
    if (Platform.OS === 'web') window.alert('Proposition envoyée !')
    router.back()
  }

  const progress = Math.min(charCount / 1000, 1)
  const isReady = content.trim().length >= 20

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Retour */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={20} color="#5B4FCF" />
        <Text style={styles.backBtnText}>Retour</Text>
      </TouchableOpacity>

      {/* Tour indicator */}
      <View style={styles.tourBadge}>
        <Ionicons name="git-branch-outline" size={14} color="#fff" />
        <Text style={styles.tourText}>Tour {currentTurn}</Text>
      </View>

      {/* Contexte */}
      {context ? (
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <Ionicons name="bookmark-outline" size={14} color="#5B4FCF" />
            <Text style={styles.contextLabel}>Dernier paragraphe</Text>
          </View>
          <Text style={styles.contextText} numberOfLines={5}>
            {context}
          </Text>
        </View>
      ) : null}

      {/* Zone d'écriture */}
      <View style={styles.writeSection}>
        <View style={styles.writeHeader}>
          <Ionicons name="create-outline" size={18} color="#1A1033" />
          <Text style={styles.writeLabel}>Ta suite</Text>
        </View>
        <Text style={styles.writeHint}>Minimum 20 caractères</Text>
        <View style={[styles.textareaContainer, isReady && styles.textareaReady]}>
          <TextInput
            style={styles.textarea}
            value={content}
            onChangeText={handleChange}
            multiline
            placeholder="Continue l'histoire ici... Laisse libre cours à ton imagination"
            placeholderTextColor="#B8AED8"
            maxLength={1000}
            autoFocus
            textAlignVertical="top"
          />
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${progress * 100}%` as any,
              backgroundColor: isReady ? '#5B4FCF' : '#C4B8E8'
            }]} />
          </View>
          <Text style={[styles.charCount, isReady && styles.charCountReady]}>
            {charCount}/1000
          </Text>
        </View>
      </View>

      {/* Bouton */}
      <TouchableOpacity
        style={[styles.btn, (!isReady || loading) && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={!isReady || loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : (
            <View style={styles.btnContent}>
              <Text style={styles.btnText}>Soumettre ma proposition</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          )
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Annuler</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  scrollContent: { padding: 20 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  backBtnText: { color: '#5B4FCF', fontSize: 15, fontWeight: '600' },
  tourBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: '#5B4FCF',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginBottom: 16,
  },
  tourText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  contextCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#5B4FCF',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  contextHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  contextLabel: {
    fontSize: 12, fontWeight: '700', color: '#5B4FCF',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  contextText: {
    fontSize: 14, color: '#4A3F72', lineHeight: 22, fontStyle: 'italic',
  },
  writeSection: { marginBottom: 20 },
  writeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  writeLabel: {
    fontFamily: 'Georgia',
    fontSize: 18, fontWeight: '700', color: '#1A1033',
  },
  writeHint: { fontSize: 13, color: '#9B8EC4', marginBottom: 12, marginLeft: 26 },
  textareaContainer: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 2, borderColor: '#E8E4F8',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  textareaReady: { borderColor: '#5B4FCF' },
  textarea: {
    padding: 16, fontSize: 15, color: '#1A1033',
    lineHeight: 24, minHeight: 200,
  },
  progressContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 10,
  },
  progressBg: {
    flex: 1, height: 4, backgroundColor: '#E8E4F8', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  charCount: { fontSize: 12, color: '#B8AED8', minWidth: 50, textAlign: 'right' },
  charCountReady: { color: '#5B4FCF', fontWeight: '600' },
  btn: {
    backgroundColor: '#5B4FCF', padding: 18, borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#5B4FCF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 6,
  },
  btnDisabled: { backgroundColor: '#C4B8E8', shadowOpacity: 0, elevation: 0 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { color: '#9B8EC4', fontSize: 14 },
})