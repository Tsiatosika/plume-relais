import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Story } from '../../types'

type Tab = 'open' | 'mine' | 'done'

export default function Feed() {
  const [stories, setStories] = useState<Story[]>([])
  const [tab, setTab] = useState<Tab>('open')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuthStore()
  const router = useRouter()

  const loadStories = async () => {
    setLoading(true)
    let data: Story[] = []

    if (tab === 'open') {
      const { data: result } = await supabase
        .from('stories')
        .select('*')
        .eq('status', 'open')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
      data = result ?? []

    } else if (tab === 'mine') {
      const { data: members } = await supabase
        .from('story_members')
        .select('story_id')
        .eq('user_id', user.id)
      const ids = members?.map(m => m.story_id) ?? []
      if (ids.length > 0) {
        const { data: result } = await supabase
          .from('stories')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: false })
        data = result ?? []
      }

    } else {
      const { data: result } = await supabase
        .from('stories')
        .select('*')
        .eq('status', 'done')
        .order('created_at', { ascending: false })
      data = result ?? []
    }

    setStories(data)
    setLoading(false)
  }

  useEffect(() => { loadStories() }, [tab])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadStories()
    setRefreshing(false)
  }

  const getStatusLabel = (story: Story) => {
    if (story.status === 'done') return '✅ Terminée'
    if (story.status === 'voting') return '🗳️ Vote en cours'
    return '🟢 En cours'
  }

  const getEmptyMessage = () => {
    if (tab === 'open') return 'Aucune histoire ouverte pour le moment.'
    if (tab === 'mine') return "Tu ne participes à aucune histoire."
    return 'Aucune histoire terminée.'
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'open', label: 'Rejoindre' },
    { key: 'mine', label: 'Mes histoires' },
    { key: 'done', label: 'Terminées' },
  ]

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#7F77DD" size="large" />
      ) : (
        <FlatList
          data={stories}
          keyExtractor={item => item.id}
          contentContainerStyle={stories.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              colors={['#7F77DD']} tintColor="#7F77DD" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>
                {tab === 'open' ? '📖' : tab === 'mine' ? '✍️' : '🏁'}
              </Text>
              <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
              {tab === 'open' && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(app)/story/create')}
                >
                  <Text style={styles.emptyBtnText}>Créer la première !</Text>
                </TouchableOpacity>
              )}
              {tab === 'mine' && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => setTab('open')}
                >
                  <Text style={styles.emptyBtnText}>Rejoindre une histoire</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/story/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.storyTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.blind_mode && (
                  <View style={styles.blindBadge}>
                    <Text style={styles.blindText}>👁</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.statusText}>{getStatusLabel(item)}</Text>
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Bouton créer */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/story/create')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FC' },
  tabBar: {
    flexDirection: 'row', padding: 12, gap: 8,
    backgroundColor: '#fff', borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#E0E0E0',
    alignItems: 'center', backgroundColor: '#fff'
  },
  tabActive: { backgroundColor: '#7F77DD', borderColor: '#7F77DD' },
  tabText: { fontSize: 12, color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#fff' },
  card: {
    margin: 12, marginBottom: 0, backgroundColor: '#fff',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EBEBEB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10
  },
  storyTitle: {
    fontSize: 16, fontWeight: '600', color: '#1A1A2E', flex: 1
  },
  blindBadge: {
    backgroundColor: '#EEEDFE', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 10, marginLeft: 8
  },
  blindText: { fontSize: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  statusText: { fontSize: 12, color: '#666' },
  dateText: { fontSize: 12, color: '#AAA' },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 40, marginTop: 60
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: {
    fontSize: 15, color: '#999', textAlign: 'center', marginBottom: 20
  },
  emptyBtn: {
    backgroundColor: '#7F77DD', paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 10
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7F77DD', alignItems: 'center',
    justifyContent: 'center', elevation: 5,
    shadowColor: '#7F77DD', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
})