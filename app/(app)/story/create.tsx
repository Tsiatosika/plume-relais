
import { useState } from 'react'
import {
  View, Text, TextInput, Switch, ScrollView,
  TouchableOpacity, StyleSheet, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={20} color="#5B4FCF" />
        <Text style={styles.backBtnText}>Retour</Text>
      </TouchableOpacity>

      <View style={styles.pageHeader}>
        <View style={styles.headerIcon}>
          <Ionicons name="create-outline" size={20} color="#5B4FCF" />
        </View>
        <View>
          <Text style={styles.pageTitle}>Nouvelle histoire</Text>
          <Text style={styles.pageSub}>Pose la première pierre du récit</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Titre de l'histoire</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder="Ex: Le mystère du manoir abandonné"
          placeholderTextColor="#B8AED8"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
      </View>

      <Text style={styles.sectionTitle}>Paragraphe d'ouverture</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Commence l'histoire ici..."
          placeholderTextColor="#B8AED8"
          value={opening}
          onChangeText={setOpening}
          multiline
          maxLength={1000}
          textAlignVertical="top"
        />
      </View>
      <Text style={styles.counter}>{opening.length}/1000</Text>

      <Text style={styles.sectionTitle}>Paramètres</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
              <Ionicons name="eye-off-outline" size={16} color="#5B4FCF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Mode aveugle</Text>
              <Text style={styles.rowHint}>Chaque auteur ne voit que les 2 derniers paragraphes</Text>
            </View>
          </View>
          <Switch
            value={blindMode}
            onValueChange={setBlindMode}
            trackColor={{ true: '#7F77DD', false: '#E0DCF2' }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
              <Ionicons name="lock-closed-outline" size={16} color="#5B4FCF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Histoire privée</Text>
              <Text style={styles.rowHint}>Visible uniquement par les membres invités</Text>
            </View>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ true: '#7F77DD', false: '#E0DCF2' }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
              <Ionicons name="people-outline" size={16} color="#5B4FCF" />
            </View>
            <Text style={styles.rowLabel}>Contributions max</Text>
          </View>
          <TextInput
            style={styles.numberInput}
            value={maxContrib}
            onChangeText={setMaxContrib}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>

        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
              <Ionicons name="time-outline" size={16} color="#5B4FCF" />
            </View>
            <Text style={styles.rowLabel}>Durée d'un tour (minutes)</Text>
          </View>
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
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : (
            <View style={styles.btnContent}>
              <Ionicons name="pencil" size={18} color="#fff" />
              <Text style={styles.btnText}>Créer l'histoire</Text>
            </View>
          )
        }
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
    alignSelf: 'flex-start', marginBottom: 16,
  },
  backBtnText: { color: '#5B4FCF', fontSize: 15, fontWeight: '600' },
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 24,
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E8E4F8',
  },
  pageTitle: {
    fontFamily: 'Georgia',
    fontSize: 21, fontWeight: '700', color: '#1A1033', letterSpacing: -0.3,
  },
  pageSub: { fontSize: 13, color: '#9B8EC4', marginTop: 2 },
  sectionTitle: {
    fontSize: 12.5, fontWeight: '700', color: '#8B7FB8',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 20, marginBottom: 8
  },
  inputWrap: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E8E4F8',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  input: {
    padding: 14, fontSize: 15, color: '#1A1033',
  },
  textarea: { minHeight: 160 },
  counter: { textAlign: 'right', color: '#B8AED8', fontSize: 12, marginTop: 6 },
  card: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1.5, borderColor: '#E8E4F8', overflow: 'hidden',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  rowIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0ECF8' },
  rowLabel: { fontSize: 14.5, color: '#1A1033', fontWeight: '600' },
  rowHint: { fontSize: 12, color: '#9B8EC4', marginTop: 2 },
  numberInput: {
    borderWidth: 1.5, borderColor: '#E8E4F8', borderRadius: 10,
    padding: 8, width: 60, textAlign: 'center', fontSize: 15,
    color: '#1A1033', fontWeight: '600',
  },
  btn: {
    backgroundColor: '#5B4FCF', padding: 17, borderRadius: 16,
    alignItems: 'center', marginTop: 26,
    shadowColor: '#5B4FCF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 4,
  },
  btnDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})