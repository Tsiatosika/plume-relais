import { useEffect, useState, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
  Animated, Platform
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Story } from '../../types'

type Tab = 'open' | 'mine' | 'done'

function AnimatedStoryCard({ story, index, onPress }: {
  story: Story; index: number; onPress: () => void
}) {
  const translateY = useRef(new Animated.Value(24)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current
  const isWeb = Platform.OS === 'web'

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 350,
        delay: index * 60, useNativeDriver: !isWeb,
      }),
      Animated.spring(translateY, {
        toValue: 0, delay: index * 60,
        useNativeDriver: !isWeb, tension: 100, friction: 12,
      }),
    ]).start()
  }, [index])

  const getStatus = (s: Story) => {
    if (s.status === 'done') return { label: 'Terminée', color: '#22C55E', bg: '#F0FDF4', icon: 'checkmark-done-outline' as const }
    if (s.status === 'voting') return { label: 'Vote ouvert', color: '#F59E0B', bg: '#FFFBEB', icon: 'podium-outline' as const }
    return { label: 'En cours', color: '#5B4FCF', bg: '#F5F3FF', icon: 'time-outline' as const }
  }

  const status = getStatus(story)

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }, { scale }] }]}>
      <TouchableOpacity
        style={styles2.card}
        onPress={onPress}
        activeOpacity={1}
        onPressIn={() => {
          Animated.spring(scale, { toValue: 0.98, useNativeDriver: !isWeb, tension: 300, friction: 10 }).start()
        }}
        onPressOut={() => {
          Animated.spring(scale, { toValue: 1, useNativeDriver: !isWeb, tension: 300, friction: 10 }).start()
        }}
      >
        {/* Accent bar */}
        <View style={[styles2.accentBar, { backgroundColor: status.color }]} />

        <View style={styles2.cardContent}>
          <View style={styles2.cardTop}>
            <Text style={styles2.storyTitle} numberOfLines={2}>
              {story.title}
            </Text>
            <View style={styles2.badges}>
              {story.blind_mode && (
                <View style={styles2.iconBadge}>
                  <Ionicons name="eye-off-outline" size={13} color="#5B4FCF" />
                </View>
              )}
              {story.visibility === 'private' && (
                <View style={[styles2.iconBadge, styles2.privateBadge]}>
                  <Ionicons name="lock-closed" size={12} color="#C2740C" />
                </View>
              )}
            </View>
          </View>

          <View style={styles2.cardBottom}>
            <View style={[styles2.statusPill, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={12} color={status.color} />
              <Text style={[styles2.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            <Text style={styles2.dateText}>
              {new Date(story.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short'
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles2 = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#fff', borderRadius: 18,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#1A1033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  accentBar: { width: 4, borderRadius: 4 },
  cardContent: { flex: 1, padding: 16 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  storyTitle: {
    fontSize: 16, fontWeight: '700', color: '#1A1033',
    flex: 1, marginRight: 8, lineHeight: 22,
  },
  badges: { flexDirection: 'row', gap: 4 },
  iconBadge: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
  },
  privateBadge: { backgroundColor: '#FFF7ED' },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 12, color: '#9B8EC4' },
})

export default function Feed() {
  const [stories, setStories] = useState<Story[]>([])
  const [tab, setTab] = useState<Tab>('open')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuthStore()
  const router = useRouter()

  const loadStories = async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    let data: Story[] = []

    try {
      if (tab === 'open') {
        const { data: result } = await supabase
          .from('stories').select('*')
          .eq('status', 'open').eq('visibility', 'public')
          .order('created_at', { ascending: false })
        data = result ?? []
      } else if (tab === 'mine') {
        const { data: members } = await supabase
          .from('story_members').select('story_id').eq('user_id', user.id)
        const ids = members?.map(m => m.story_id) ?? []
        if (ids.length > 0) {
          const { data: result } = await supabase
            .from('stories').select('*').in('id', ids)
            .order('created_at', { ascending: false })
          data = result ?? []
        }
      } else {
        const { data: result } = await supabase
          .from('stories').select('*').eq('status', 'done')
          .order('created_at', { ascending: false })
        data = result ?? []
      }
    } catch (e) { console.error(e) }

    setStories(data)
    setLoading(false)
  }

  useEffect(() => { loadStories() }, [tab])

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'open', label: 'Explorer', icon: 'compass-outline' },
    { key: 'mine', label: 'Mes histoires', icon: 'create-outline' },
    { key: 'done', label: 'Terminées', icon: 'flag-outline' },
  ]

  const emptyConfig = {
    open: { icon: 'library-outline' as const, text: 'Aucune histoire ouverte.', action: 'Créer la première !', onAction: () => router.push('/(app)/story/create') },
    mine: { icon: 'create-outline' as const, text: "Tu ne participes à aucune histoire.", action: 'Rejoindre une histoire', onAction: () => setTab('open') },
    done: { icon: 'flag-outline' as const, text: 'Aucune histoire terminée.', action: null, onAction: null },
  }

  const empty = emptyConfig[tab]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="pencil" size={20} color="#5B4FCF" style={{ transform: [{ rotate: '-45deg' }] }} />
          <Text style={styles.headerTitle}>Plume Relais</Text>
        </View>
        <Text style={styles.headerSub}>Histoires collaboratives</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={t.icon}
              size={15}
              color={tab === t.key ? '#fff' : '#7B6FA0'}
            />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#5B4FCF" size="large" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={item => item.id}
          contentContainerStyle={
            stories.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await loadStories(); setRefreshing(false) }}
              colors={['#5B4FCF']} tintColor="#5B4FCF"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name={empty.icon} size={36} color="#B8AED8" />
              </View>
              <Text style={styles.emptyTitle}>{empty.text}</Text>
              {empty.action && (
                <TouchableOpacity style={styles.emptyBtn} onPress={empty.onAction!} activeOpacity={0.85}>
                  <Text style={styles.emptyBtnText}>{empty.action}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <AnimatedStoryCard
              story={item} index={index}
              onPress={() => router.push(`/(app)/story/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/story/create')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  headerSection: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0ECF8',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 23, fontWeight: '700', color: '#1A1033', letterSpacing: -0.5,
  },
  headerSub: { fontSize: 13, color: '#9B8EC4', marginTop: 2, marginLeft: 28 },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 12, gap: 8, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0ECF8',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 12,
    backgroundColor: '#F7F5FF',
  },
  tabActive: { backgroundColor: '#5B4FCF' },
  tabText: { fontSize: 11, color: '#7B6FA0', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: '#9B8EC4', fontSize: 14 },
  emptyContainer: { flex: 1 },
  listContainer: { paddingBottom: 100, paddingTop: 4 },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, marginTop: 60,
  },
  emptyIconWrap: {
    width: 84, height: 84, borderRadius: 26,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 18, borderWidth: 1.5, borderColor: '#E8E4F8',
  },
  emptyTitle: {
    fontSize: 16, color: '#7B6FA0', textAlign: 'center',
    marginBottom: 24, lineHeight: 24,
  },
  emptyBtn: {
    backgroundColor: '#5B4FCF', paddingHorizontal: 28,
    paddingVertical: 14, borderRadius: 14,
    shadowColor: '#5B4FCF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 20,
    backgroundColor: '#5B4FCF', alignItems: 'center',
    justifyContent: 'center', elevation: 8,
    shadowColor: '#5B4FCF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16,
  },
})