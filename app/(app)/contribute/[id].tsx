import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
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

  const handleSubmit = async () => {
    if (content.trim().length < 20) {
      Alert.alert('Erreur', 'Écris au moins 20 caractères.')
      return
    }

    setLoading(true)

    const { data: existingList } = await supabase
      .from('proposals').select('id')
      .eq('story_id', id).eq('author_id', user.id)
      .eq('turn_number', currentTurn)

    if (existingList && existingList.length > 0) {
      setLoading(false)
      Alert.alert('Erreur', 'Tu as déjà une proposition ce tour.')
      return
    }

    const { error } = await supabase.from('proposals').insert({
      story_id: id,
      author_id: user.id,
      content: content.trim(),
      turn_number: currentTurn,
    })

    setLoading(false)
    if (error) {
      Alert.alert('Erreur', error.message)
      return
    }

    Alert.alert('Succès', 'Proposition envoyée ! Attends les votes.')
    router.back()
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {context ? (
        <>
          <Text style={styles.contextLabel}>Dernier paragraphe</Text>
          <View style={styles.contextBox}>
            <Text style={styles.contextText} numberOfLines={4}>{context}</Text>
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Ta suite (tour {currentTurn})</Text>
      <TextInput
        style={styles.textarea}
        value={content}
        onChangeText={setContent}
        multiline
        placeholder="Continue l'histoire ici..."
        maxLength={1000}
        autoFocus
      />
      <Text style={styles.counter}>{content.length}/1000</Text>

      <TouchableOpacity
        style={[styles.btn, (loading || content.trim().length < 20) && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading || content.trim().length < 20}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Envoyer ma proposition</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  contextLabel: {
    fontSize: 12, fontWeight: '600', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8
  },
  contextBox: {
    backgroundColor: '#F8F8FC', borderRadius: 10, padding: 14,
    marginBottom: 24, borderWidth: 1, borderColor: '#EBEBEB'
  },
  contextText: { fontSize: 14, color: '#555', lineHeight: 22, fontStyle: 'italic' },
  label: { fontSize: 16, fontWeight: '600', color: '#1A1A2E', marginBottom: 10 },
  textarea: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 16, fontSize: 15, minHeight: 220,
    textAlignVertical: 'top', backgroundColor: '#FAFAFA'
  },
  counter: { textAlign: 'right', color: '#BBB', fontSize: 12, marginTop: 4 },
  btn: {
    backgroundColor: '#7F77DD', padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 20
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})