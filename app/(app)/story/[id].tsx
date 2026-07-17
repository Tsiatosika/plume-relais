import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert, Platform, Image
} from 'react-native'
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import { useRealtimeStory } from '../../../hooks/useRealtime'
import { useCountdown } from '../../../hooks/useCountdown'
import { Story, Paragraph } from '../../../types'
import CommentSection from '../../../components/CommentSection'
import BadgeSystem from '../../../components/BadgeSystem'
import { useReputation } from '../../../hooks/useReputation'

function TurnTimer({
  startedAt,
  durationMinutes,
}: {
  startedAt: string | null
  durationMinutes: number
}) {
  const { timeLeft, isExpired, pct } = useCountdown(startedAt, durationMinutes)

  if (!startedAt) return null

  const barColor = pct > 50 ? '#5B4FCF' : pct > 20 ? '#F59E0B' : '#EF4444'

  return (
    <View style={timerStyles.container}>
      <View style={timerStyles.header}>
        <View style={timerStyles.labelRow}>
          <Ionicons name="time-outline" size={14} color="#8B7FB8" />
          <Text style={timerStyles.label}>Temps restant ce tour</Text>
        </View>
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
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 16, borderWidth: 1.5, borderColor: '#E8E4F8',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, color: '#8B7FB8', fontWeight: '600' },
  time: { fontSize: 15, fontWeight: '700', color: '#5B4FCF' },
  timeExpired: { color: '#EF4444' },
  bar: {
    height: 6, backgroundColor: '#F0ECF8',
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

  // Récupérer les badges du créateur de l'histoire
  const { 
    badges: creatorBadges, 
    userBadges: creatorUserBadges,
    loading: creatorLoading 
  } = useReputation(story?.creator_id || '')

  const loadAll = useCallback(async () => {
    if (!user) return
    try {
      const { data: storyData } = await supabase
        .from('stories').select('*').eq('id', id).single()
      if (!storyData) return
      setStory(storyData)
      navigation.setOptions({ headerShown: false })

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
    } catch (error) {
      console.error('Erreur chargement:', error)
      Alert.alert('Erreur', 'Impossible de charger l\'histoire')
      setLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => { if (user) loadAll() }, [loadAll])

  useRealtimeStory(id, () => loadAll(), () => loadAll(), () => loadAll())

  const handleJoin = async () => {
    setJoining(true)
    const { error } = await supabase
      .from('story_members')
      .insert({ story_id: id, user_id: user.id })
    setJoining(false)
    if (error && error.code !== '23505') {
      Alert.alert('Erreur', error.message)
      return
    }
    setIsMember(true)
    Alert.alert('Succès', 'Tu as rejoint l\'histoire !')
    loadAll()
  }

  const handleShareLink = async () => {
    const url = Platform.OS === 'web' ? `${window.location.origin}/story/${id}` : `plumerelais://story/${id}`
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url)
      }
      Alert.alert('Lien copié !', url)
    } catch {
      Alert.alert("Lien de l'histoire", url)
    }
  }

  const handleShareText = async () => {
    if (!story || paragraphs.length === 0) {
      Alert.alert('Info', 'Cette histoire est vide.')
      return
    }

    const lines: string[] = []
    lines.push(`✒️ ${story.title}`)
    
    if (story.cover_url) {
      lines.push(`📷 Image: ${story.cover_url}`)
    }
    
    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push('')

    paragraphs.forEach((para, index) => {
      const author = (para.author as any)?.pseudo ?? 'Anonyme'
      if (index === 0) {
        lines.push(`[ Ouverture par ${author} ]`)
      } else {
        lines.push(`[ Tour ${para.turn_number} — ${author} ]`)
      }
      lines.push(para.content)
      lines.push('')
    })

    lines.push('━━━━━━━━━━━━━━━━━━━━')
    lines.push('📖 Écrit à plusieurs mains sur Plume Relais')
    if (story.cover_url) {
      lines.push('🖼️ Avec image de couverture')
    }

    const fullText = lines.join('\n')

    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(fullText)
      }
      Alert.alert('📋 Histoire copiée !', 'Tu peux la coller où tu veux.')
    } catch {
      Alert.alert('Info', 'Impossible de copier automatiquement.')
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B4FCF" />
      </View>
    )
  }

  if (!story) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={36} color="#C4B8E8" />
        <Text style={styles.errorText}>Histoire introuvable</Text>
      </View>
    )
  }

  const statusConfig = story.status === 'done'
    ? { label: 'Terminée', icon: 'checkmark-done-circle-outline' as const, color: '#22C55E', bg: '#F0FDF4' }
    : story.status === 'voting'
      ? { label: 'Vote en cours', icon: 'podium-outline' as const, color: '#F59E0B', bg: '#FFFBEB' }
      : { label: 'En cours', icon: 'time-outline' as const, color: '#5B4FCF', bg: '#F5F3FF' }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#1A1033" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{story.title}</Text>
        {story.status === 'done' ? (
          <TouchableOpacity
            style={styles.headerShareBtn}
            onPress={handleShareLink}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="share-social-outline" size={20} color="#5B4FCF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={['#5B4FCF']} tintColor="#5B4FCF" />
        }
      >
        {/* Badges de l'histoire */}
        <View style={styles.badges}>
          {story.blind_mode && (
            <View style={styles.badge}>
              <Ionicons name="eye-off-outline" size={13} color="#5B4FCF" />
              <Text style={styles.badgeText}>Mode aveugle</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={13} color={statusConfig.color} />
            <Text style={[styles.badgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Badges du créateur */}
        {!creatorLoading && story.creator_id && (
          <View style={styles.creatorBadgesContainer}>
            <View style={styles.creatorBadgesHeader}>
              <Ionicons name="ribbon-outline" size={14} color="#5B4FCF" />
              <Text style={styles.creatorBadgesLabel}>Badges du créateur</Text>
            </View>
            <BadgeSystem 
              badges={creatorBadges} 
              userBadges={creatorUserBadges}
              compact={true}
            />
          </View>
        )}

        {/* Image de couverture */}
        {story.cover_url && (
          <View style={styles.coverContainer}>
            <Image 
              source={{ uri: story.cover_url }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
          </View>
        )}

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
            <Ionicons name="eye-off-outline" size={16} color="#D97706" />
            <Text style={styles.blindWarningText}>
              Mode aveugle — tu ne vois que les 2 derniers paragraphes.
              Propose ta suite pour tout lire.
            </Text>
          </View>
        )}

        {/* Paragraphes */}
        {paragraphs.length === 0 ? (
          <View style={styles.emptyPara}>
            <View style={styles.emptyParaIconWrap}>
              <Ionicons name="document-text-outline" size={30} color="#B8AED8" />
            </View>
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
                    <Ionicons name="sparkles-outline" size={10} color="#15803D" />
                    <Text style={styles.openingBadgeText}>Ouverture</Text>
                  </View>
                )}
              </View>
              <Text style={styles.paraContent}>{para.content}</Text>
              {index < paragraphs.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}

        {/* Boutons partage pour histoires terminées */}
        {story.status === 'done' && (
          <View style={styles.shareSection}>
            <Text style={styles.shareSectionTitle}>Partager cette histoire</Text>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareLink}
              activeOpacity={0.85}
            >
              <View style={styles.shareBtnIconWrap}>
                <Ionicons name="link-outline" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.shareBtnTitle}>Copier le lien</Text>
                <Text style={styles.shareBtnSub}>Partage l'URL de l'histoire</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, styles.shareBtnSecondary]}
              onPress={handleShareText}
              activeOpacity={0.85}
            >
              <View style={[styles.shareBtnIconWrap, styles.shareBtnIconWrapSecondary]}>
                <Ionicons name="clipboard-outline" size={20} color="#5B4FCF" />
              </View>
              <View>
                <Text style={[styles.shareBtnTitle, { color: '#5B4FCF' }]}>
                  Copier le texte complet
                </Text>
                <Text style={[styles.shareBtnSub, { color: '#9B8EC4' }]}>
                  Tous les paragraphes avec les auteurs
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Commentaires pour histoires terminées */}
        {story.status === 'done' && (
          <View style={styles.commentSection}>
            <CommentSection storyId={id} />
          </View>
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
            activeOpacity={0.85}
          >
            {joining
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Rejoindre l'histoire</Text>
                </>
              )
            }
          </TouchableOpacity>
        </View>
      )}

      {isMember && story.status === 'open' && !hasProposed && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/(app)/contribute/${id}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Proposer une suite</Text>
          </TouchableOpacity>
        </View>
      )}

      {isMember && story.status === 'open' && hasProposed && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push(`/(app)/story/vote/${id}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="podium-outline" size={18} color="#5B4FCF" />
            <Text style={styles.actionBtnTextSecondary}>
              Voir les propositions & voter
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isMember && story.status === 'done' && (
        <View style={styles.actionBar}>
          <View style={styles.doneBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#15803D" />
            <Text style={styles.doneText}>Histoire terminée — bonne lecture !</Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F7F5FF' },
  errorText: { color: '#9B8EC4', fontSize: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0ECF8',
    gap: 8,
  },
  headerBackBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontFamily: 'Georgia', fontSize: 17,
    fontWeight: '700', color: '#1A1033', letterSpacing: -0.2,
  },
  headerShareBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
  headerSpacer: { width: 36 },
  scroll: { padding: 20 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5F3FF', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 10
  },
  badgeText: { fontSize: 12, color: '#5B4FCF', fontWeight: '600' },
  creatorBadgesContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E4F8',
  },
  creatorBadgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  creatorBadgesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B4FCF',
  },
  coverContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E4F8',
    backgroundColor: '#F0ECF8',
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0ECF8',
  },
  blindWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A'
  },
  blindWarningText: { flex: 1, fontSize: 13, color: '#92640A', lineHeight: 18 },
  emptyPara: { alignItems: 'center', paddingVertical: 50 },
  emptyParaIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 1.5, borderColor: '#E8E4F8',
  },
  emptyParaText: { color: '#9B8EC4', fontSize: 15 },
  paraBlock: { marginBottom: 8 },
  paraHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  paraAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F5F3FF', alignItems: 'center',
    justifyContent: 'center', marginRight: 8
  },
  paraAvatarText: { fontSize: 14, fontWeight: '700', color: '#5B4FCF' },
  paraAuthor: { fontSize: 13, fontWeight: '600', color: '#4A3F72', flex: 1 },
  openingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8
  },
  openingBadgeText: { fontSize: 11, color: '#15803D', fontWeight: '600' },
  paraContent: { fontSize: 16, color: '#1A1033', lineHeight: 26 },
  divider: { height: 1, backgroundColor: '#F0ECF8', marginVertical: 20 },
  shareSection: {
    marginTop: 32, padding: 16, backgroundColor: '#fff',
    borderRadius: 18, borderWidth: 1.5, borderColor: '#E8E4F8',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  shareSectionTitle: {
    fontSize: 12.5, fontWeight: '700', color: '#9B8EC4',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#5B4FCF', padding: 14,
    borderRadius: 14, marginBottom: 10
  },
  shareBtnSecondary: {
    backgroundColor: '#F7F5FF', borderWidth: 1.5, borderColor: '#E8E4F8'
  },
  shareBtnIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtnIconWrapSecondary: { backgroundColor: '#EDE8FA' },
  shareBtnTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  shareBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  commentSection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderWidth: 1.5,
    borderColor: '#E8E4F8',
    shadowColor: '#1A1033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F0ECF8'
  },
  actionBtn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#5B4FCF', padding: 16,
    borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5B4FCF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 4,
  },
  actionBtnSecondary: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#5B4FCF',
    shadowOpacity: 0, elevation: 0,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionBtnTextSecondary: { color: '#5B4FCF', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  doneBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F0FDF4', padding: 14,
    borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0',
  },
  doneText: { color: '#15803D', fontWeight: '700', fontSize: 15 },
})