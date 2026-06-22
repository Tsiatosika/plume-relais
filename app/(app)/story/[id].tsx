import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native'
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import { useRealtimeStory } from '../../../hooks/useRealtime'
import { useCountdown } from '../../../hooks/useCountdown'
import { Story, Paragraph } from '../../../types'

function TurnTimer({
  startedAt,
  durationMinutes,
}: {
  startedAt: string | null
  durationMinutes: number
}) {
  const { timeLeft, isExpired, pct } = useCountdown(startedAt, durationMinutes)

  if (!startedAt) return null

  const barColor = pct > 50 ? '#7F77DD' : pct > 20 ? '#FFA726' : '#EF5350'

  return (
    <View style={timerStyles.container}>
      <View style={timerStyles.header}>
        <Text style={timerStyles.label}>⏱ Temps restant ce tour</Text>
        <Text style={[timerStyles.time, isExpired && timerStyles.timeExpired]}>
          {timeLeft}
        </Text>
      </View>
      <View style={timerStyles.bar}>
        <View
          style={[
            timerStyles.fill,
            { width: `${pct}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  )
}

const timerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F8FC', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#EBEBEB'
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8
  },
  label: { fontSize: 13, color: '#666', fontWeight: '500' },
  time: { fontSize: 15, fontWeight: '700', color: '#7F77DD' },
  timeExpired: { color: '#EF5350' },
  bar: {
    height: 6, backgroundColor: '#E0E0E0',
    borderRadius: 3, overflow: 'hidden'
  },
  fill: { height: 6, borderRadius: 3 },
})

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()
  const navigation = useNavigation()

  const [story, setStory] = useState<Story | null>(null)
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([])
  const [isMember, setIsMember] = useState(false)
  const [hasProposed, setHasProposed] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joining, setJoining] = useState(false)

  const loadAll = useCallback(async () => {
    const { data: storyData } = await supabase
      .from('stories').select('*').eq('id', id).single()
    if (!storyData) return
    setStory(storyData)
    navigation.setOptions({ title: storyData.title })

    const { data: memberData } = await supabase
      .from('story_members')
      .select('*').eq('story_id', id).eq('user_id', user.id).single()
    const member = !!memberData
    setIsMember(member)

    const { data: paraList } = await supabase
      .from('paragraphs').select('turn_number')
      .eq('story_id', id)
      .order('turn_number', { ascending: false })
      .limit(1)
    const turn = paraList && paraList.length > 0 ? paraList[0].turn_number + 1 : 1
    setCurrentTurn(turn)

    const { data: myProposalList } = await supabase
      .from('proposals').select('id')
      .eq('story_id', id).eq('author_id', user.id)
      .eq('turn_number', turn)
    const proposed = (myProposalList?.length ?? 0) > 0
    setHasProposed(proposed)

    if (storyData.blind_mode && member && !proposed) {
      const { data: blindParas } = await supabase
        .from('paragraphs')
        .select('*, author:profiles(pseudo, avatar_url)')
        .eq('story_id', id)
        .order('turn_number', { ascending: false })
        .limit(2)
      setParagraphs((blindParas ?? []).reverse())
    } else {
      const { data: allParas } = await supabase
        .from('paragraphs')
        .select('*, author:profiles(pseudo, avatar_url)')
        .eq('story_id', id)
        .order('turn_number', { ascending: true })
      setParagraphs(allParas ?? [])
    }

    setLoading(false)
  }, [id, user.id])

  useEffect(() => { loadAll() }, [loadAll])

  useRealtimeStory(id, () => loadAll(), () => loadAll(), () => loadAll())

  const handleJoin = async () => {
    setJoining(true)
    const { error } = await supabase
      .from('story_members')
      .insert({ story_id: id, user_id: user.id })
    setJoining(false)
    if (error && error.code !== '23505') {
      window.alert('Erreur : ' + error.message)
      return
    }
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
        {/* Badges */}
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

        {/* Compteur de temps */}
        {story.status === 'open' && isMember && (
          <TurnTimer
            startedAt={story.turn_started_at}
            durationMinutes={story.turn_duration_minutes}
          />
        )}

        {/* Avertissement mode aveugle */}
        {story.blind_mode && isMember && !hasProposed && story.status === 'open' && (
          <View style={styles.blindWarning}>
            <Text style={styles.blindWarningText}>
              👁 Mode aveugle — tu ne vois que les 2 derniers paragraphes.
              Propose ta suite pour tout lire.
            </Text>
          </View>
        )}

        {/* Paragraphes */}
        {paragraphs.length === 0 ? (
          <View style={styles.emptyPara}>
            <Text style={styles.emptyParaText}>Aucun paragraphe pour l'instant.</Text>
          </View>
        ) : (
          paragraphs.map((para, index) => (
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
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Barre d'action */}
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
            <Text style={styles.actionBtnTextSecondary}>
              🗳️ Voir les propositions & voter
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isMember && story.status === 'done' && (
        <View style={styles.actionBar}>
          <View style={styles.doneBanner}>
            <Text style={styles.doneText}>✅ Histoire terminée — bonne lecture !</Text>
          </View>
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
  badges: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
  emptyPara: { alignItems: 'center', paddingVertical: 40 },
  emptyParaText: { color: '#AAA', fontSize: 15 },
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
  actionBtnSecondary: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#7F77DD'
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionBtnTextSecondary: { color: '#7F77DD', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  doneBanner: {
    backgroundColor: '#E8F5E9', padding: 14,
    borderRadius: 12, alignItems: 'center'
  },
  doneText: { color: '#388E3C', fontWeight: '600', fontSize: 15 },
})