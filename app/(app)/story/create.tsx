import { useState } from 'react'
import {
  View, Text, TextInput, Switch, ScrollView,
  TouchableOpacity, StyleSheet, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'

export default function CreateStory() {
  const [title, setTitle] = useState('')
  const [opening, setOpening] = useState('')
  const [blindMode, setBlindMode] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [maxContrib, setMaxContrib] = useState('10')
  const [turnDuration, setTurnDuration] = useState('60')
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  const router = useRouter()

  const handleCreate = async () => {
    if (!title.trim()) {
      window.alert('Le titre est obligatoire')
      return
    }
    if (!opening.trim()) {
      window.alert("Le paragraphe d'ouverture est obligatoire")
      return
    }
    if (opening.trim().length < 20) {
      window.alert("L'ouverture est trop courte (min. 20 caractères)")
      return
    }

    setLoading(true)

    // Dans handleCreate, mettre à jour le statut correctement
  const { data: story, error } = await supabase
    .from('stories')
    .insert({
      title: title.trim(),
      creator_id: user.id,
      visibility: isPrivate ? 'private' : 'public',
      blind_mode: blindMode,
      max_contributions: parseInt(maxContrib) || 10,
      turn_duration_minutes: parseInt(turnDuration) || 60,
      status: 'open', // Commence en 'open' pour permettre les contributions
      turn_started_at: new Date().toISOString(), // Démarrer le timer immédiatement
    })
    .select()
    .single()

    if (error) {
      setLoading(false)
      window.alert('Erreur : ' + error.message)
      return
    }

    await supabase.from('paragraphs').insert({
      story_id: story.id,
      author_id: user.id,
      content: opening.trim(),
      turn_number: 0,
    })

    await supabase.from('story_members').insert({
      story_id: story.id,
      user_id: user.id,
    })

    setLoading(false)
    router.replace(`/(app)/story/${story.id}`)
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Titre de l'histoire</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Le mystère du manoir abandonné"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />

      <Text style={styles.sectionTitle}>Paragraphe d'ouverture</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Commence l'histoire ici..."
        value={opening}
        onChangeText={setOpening}
        multiline
        maxLength={1000}
      />
      <Text style={styles.counter}>{opening.length}/1000</Text>

      <Text style={styles.sectionTitle}>Paramètres</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.rowLabel}>Mode aveugle</Text>
            <Text style={styles.rowHint}>Chaque auteur ne voit que les 2 derniers paragraphes</Text>
          </View>
          <Switch
            value={blindMode}
            onValueChange={setBlindMode}
            trackColor={{ true: '#7F77DD', false: '#E0E0E0' }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.row, styles.rowBorder]}>
          <View>
            <Text style={styles.rowLabel}>Histoire privée</Text>
            <Text style={styles.rowHint}>Visible uniquement par les membres invités</Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ true: '#7F77DD', false: '#E0E0E0' }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.row, styles.rowBorder]}>
          <Text style={styles.rowLabel}>Contributions max</Text>
          <TextInput
            style={styles.numberInput}
            value={maxContrib}
            onChangeText={setMaxContrib}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        <View style={[styles.row, styles.rowBorder]}>
          <Text style={styles.rowLabel}>Durée d'un tour (minutes)</Text>
          <TextInput
            style={styles.numberInput}
            value={turnDuration}
            onChangeText={setTurnDuration}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>✒️ Créer l'histoire</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FC', padding: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 20, marginBottom: 8
  },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    fontSize: 15, borderWidth: 1, borderColor: '#E8E8E8'
  },
  textarea: { minHeight: 160, textAlignVertical: 'top' },
  counter: { textAlign: 'right', color: '#BBB', fontSize: 12, marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E8E8E8', overflow: 'hidden'
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  rowLabel: { fontSize: 15, color: '#1A1A2E', fontWeight: '500' },
  rowHint: { fontSize: 12, color: '#AAA', marginTop: 2, maxWidth: 220 },
  numberInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    padding: 8, width: 60, textAlign: 'center', fontSize: 15
  },
  btn: {
    backgroundColor: '#7F77DD', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 24
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})