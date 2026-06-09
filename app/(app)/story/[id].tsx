import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import { useRealtimeStory } from '../../../hooks/useRealtime'
import { Story, Paragraph } from '../../../types'

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()

  const [story, setStory] = useState<Story | null>(null)
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([])
  const [isMember, setIsMember] = useState(false)
  const [hasProposed, setHasProposed] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joining, setJoining] = useState(false)

  const loadAll = useCallback(async () => {
    // Charge l'histoire
    const { data: storyData } = await supabase
      .from('stories').select('*').eq('id', id).single()
    if (!storyData) return
    setStory(storyData)

    // Vérifie si membre
    const { data: memberData } = await supabase
      .from('story_members')
      .select('*').eq('story_id', id).eq('user_id', user.id).single()
    const member = !!memberData
    setIsMember(member)

    // Dernier tour
    const { data: lastPara } = await supabase
      .from('paragraphs').select('turn_number')
      .eq('story_id', id)
      .order('turn_number', { ascending: false })
      .limit(1).single()
    const turn = (lastPara?.turn_number ?? 0) + 1
    setCurrentTurn(turn)

    // A déjà proposé ce tour ?
    const { data: myProposal } = await supabase
      .from('proposals').select('id')
      .eq('story_id', id).eq('author_id', user.id)
      .eq('turn_number', turn).single()
    const proposed = !!myProposal
    setHasProposed(proposed)

    // Charge paragraphes selon mode aveugle
    let query = supabase
      .from('paragraphs')
      .select('*, author:profiles(pseudo, avatar_url)')
      .eq('story_id', id)
      .order('turn_number', { ascending: true })

    if (storyData.blind_mode && member && !proposed) {
      const { data: blindParas } = await supabase
        .from('paragraphs')
        .select('*, author:profiles(pseudo, avatar_url)')
        .eq('story_id', id)
        .order('turn_number', { ascending: false })
        .limit(2)
      setParagraphs((blindParas ?? []).reverse())
    } else {
      const { data: allParas } = await query
      setParagraphs(allParas ?? [])
    }

    setLoading(false)
  }, [id, user.id])

  useEffect(() => { loadAll() }, [loadAll])

  useRealtimeStory(
    id,
    () => loadAll(),
    () => loadAll(),
    () => loadAll()
  )

  const handleJoin = async () => {
    setJoining(true)
    const { error } = await supabase
      .from('story_members')
      .insert({ story_id: id, user_id: user.id })
    setJoining(false)
    if (error) return Alert.alert('Erreur', error.message)
    setIsMember(true)
    loadAll()
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </View>
    )
  }

  if (!story) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Histoire introuvable</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={['#7F77DD']} />
        }
      >
        {/* Header */}
        <Text style={styles.title}>{story.title}</Text>
        <View style={styles.badges}>
          {story.blind_mode && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>👁 Mode aveugle</Text>
            </View>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {story.status === 'done' ? '✅ Terminée'
                : story.status === 'voting' ? '🗳️ Vote en cours'
                : '🟢 En cours'}
            </Text>
          </View>
        </View>

        {/* Avertissement mode aveugle */}
        {story.blind_mode && isMember && !hasProposed && story.status === 'open' && (
          <View style={styles.blindWarning}>
            <Text style={styles.blindWarningText}>
              👁 Mode aveugle activé — tu ne vois que les 2 derniers paragraphes.
              Propose ta suite pour lire l'histoire complète.
            </Text>
          </View>
        )}

        {/* Paragraphes */}
        {paragraphs.map((para, index) => (
          <View key={para.id} style={styles.paraBlock}>
            <View style={styles.paraHeader}>
              <View style={styles.paraAvatar}>
                <Text style={styles.paraAvatarText}>
                  {(para.author as any)?.pseudo?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={styles.paraAuthor}>
                {(para.author as any)?.pseudo ?? 'Anonyme'}
              </Text>
              {para.turn_number === 0 && (
                <View style={styles.openingBadge}>
                  <Text style={styles.openingBadgeText}>Ouverture</Text>
                </View>
              )}
            </View>
            <Text style={styles.paraContent}>{para.content}</Text>
            {index < paragraphs.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Actions en bas */}
      {!isMember && story.status === 'open' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionBtn, joining && styles.btnDisabled]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.actionBtnText}>Rejoindre l'histoire</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {isMember && story.status === 'open' && !hasProposed && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/(app)/contribute/${id}`)}
          >
            <Text style={styles.actionBtnText}>✒️ Proposer une suite</Text>
          </TouchableOpacity>
        </View>
      )}

      {isMember && story.status === 'open' && hasProposed && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push(`/(app)/story/vote/${id}`)}
          >
            <Text style={styles.actionBtnTextSecondary}>🗳️ Voir les propositions & voter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#999', fontSize: 16 },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badge: {
    backgroundColor: '#EEEDFE', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10
  },
  badgeText: { fontSize: 12, color: '#7F77DD' },
  blindWarning: {
    backgroundColor: '#FFF8E7', borderRadius: 10, padding: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#FFE082'
  },
  blindWarningText: { fontSize: 13, color: '#8B6914', lineHeight: 18 },
  paraBlock: { marginBottom: 8 },
  paraHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  paraAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEEDFE', alignItems: 'center',
    justifyContent: 'center', marginRight: 8
  },
  paraAvatarText: { fontSize: 14, fontWeight: '600', color: '#7F77DD' },
  paraAuthor: { fontSize: 13, fontWeight: '600', color: '#555', flex: 1 },
  openingBadge: {
    backgroundColor: '#E8F5E9', paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 8
  },
  openingBadgeText: { fontSize: 11, color: '#388E3C' },
  paraContent: { fontSize: 16, color: '#1A1A2E', lineHeight: 26 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  actionBtn: {
    backgroundColor: '#7F77DD', padding: 16,
    borderRadius: 12, alignItems: 'center'
  },
  actionBtnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#7F77DD' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionBtnTextSecondary: { color: '#7F77DD', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
})