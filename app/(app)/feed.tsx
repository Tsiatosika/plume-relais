import { useEffect, useState, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
  Animated, Platform, Image
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Story } from '../../types'
import BadgeSystem from '../../components/BadgeSystem'
import { useReputation } from '../../hooks/useReputation'

type Tab = 'open' | 'mine' | 'done'

function AnimatedStoryCard({
  story,
  index,
  onPress,
}: {
  story: Story
  index: number
  onPress: () => void
}) {
  const translateY = useRef(new Animated.Value(30)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current

  const { badges, userBadges, loading } = useReputation(story.creator_id)

  useEffect(() => {
    // CORRECTION : Désactiver useNativeDriver sur le Web
    const isWeb = Platform.OS === 'web'
    
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 80, 400),
        useNativeDriver: !isWeb, // ← Désactivé sur Web
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: Math.min(index * 80, 400),
        useNativeDriver: !isWeb, // ← Désactivé sur Web
        tension: 80,
        friction: 10,
      }),
    ]).start()
  }, [index])

  const getStatusLabel = (s: Story) => {
    if (s.status === 'done') return '✅ Terminée'
    if (s.status === 'voting') return '🗳️ Vote en cours'
    return '🟢 En cours'
  }

  const onPressIn = () => {
    const isWeb = Platform.OS === 'web'
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: !isWeb, // ← Désactivé sur Web
      tension: 200,
      friction: 10,
    }).start()
  }

  const onPressOut = () => {
    const isWeb = Platform.OS === 'web'
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: !isWeb, // ← Désactivé sur Web
      tension: 200,
      friction: 10,
    }).start()
  }

  return (
    <Animated.View
      style={[
        cardStyles.wrapper,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <TouchableOpacity
        style={cardStyles.card}
        onPress={onPress}
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {story.cover_url && (
          <Image 
            source={{ uri: story.cover_url }} 
            style={cardStyles.coverImage}
            resizeMode="cover"
          />
        )}
        
        <View style={cardStyles.cardContent}>
          <View style={cardStyles.cardHeader}>
            <Text style={cardStyles.storyTitle} numberOfLines={2}>
              {story.title}
            </Text>
            <View style={cardStyles.badgeContainer}>
              {story.blind_mode && (
                <View style={cardStyles.blindBadge}>
                  <Ionicons name="eye-off-outline" size={12} color="#5B4FCF" />
                </View>
              )}
              {story.visibility === 'private' && (
                <View style={cardStyles.privateBadge}>
                  <Ionicons name="lock-closed-outline" size={12} color="#F59E0B" />
                </View>
              )}
            </View>
          </View>
          
          {/* Badges du créateur */}
          {!loading && badges.length > 0 && (
            <View style={cardStyles.creatorBadges}>
              <BadgeSystem 
                badges={badges} 
                userBadges={userBadges}
                compact={true}
              />
            </View>
          )}
          
          <View style={cardStyles.cardFooter}>
            <Text style={cardStyles.statusText}>{getStatusLabel(story)}</Text>
            <Text style={cardStyles.dateText}>
              {new Date(story.created_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const cardStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  coverImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F0ECF8',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1033',
    flex: 1,
    marginRight: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  blindBadge: {
    backgroundColor: '#EEEDFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  privateBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  creatorBadges: {
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: { fontSize: 12, color: '#666' },
  dateText: { fontSize: 12, color: '#AAA' },
})

export default function Feed() {
  const [stories, setStories] = useState<Story[]>([])
  const [tab, setTab] = useState<Tab>('open')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuthStore()
  const router = useRouter()

  const loadStories = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    let data: Story[] = []

    try {
      if (tab === 'open') {
        const { data: result, error } = await supabase
          .from('stories')
          .select('*')
          .eq('status', 'open')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erreur chargement histoires ouvertes:', error)
        } else {
          data = result ?? []
        }
      } else if (tab === 'mine') {
        const { data: members, error: memberError } = await supabase
          .from('story_members')
          .select('story_id')
          .eq('user_id', user.id)

        if (memberError) {
          console.error('Erreur chargement membres:', memberError)
        } else {
          const ids = members?.map(m => m.story_id) ?? []
          if (ids.length > 0) {
            const { data: result, error } = await supabase
              .from('stories')
              .select('*')
              .in('id', ids)
              .order('created_at', { ascending: false })

            if (error) {
              console.error('Erreur chargement mes histoires:', error)
            } else {
              data = result ?? []
            }
          }
        }
      } else {
        const { data: result, error } = await supabase
          .from('stories')
          .select('*')
          .eq('status', 'done')
          .or(`visibility.eq.public,creator_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erreur chargement histoires terminées:', error)
        } else {
          data = result ?? []
        }
      }
    } catch (error) {
      console.error('Erreur inattendue:', error)
    }

    setStories(data)
    setLoading(false)
  }

  useEffect(() => {
    loadStories()
  }, [tab])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadStories()
    setRefreshing(false)
  }

  const getEmptyMessage = () => {
    if (tab === 'open') return 'Aucune histoire ouverte pour le moment.'
    if (tab === 'mine') return "Tu ne participes à aucune histoire."
    return 'Aucune histoire terminée.'
  }

  const getEmptyIcon = () => {
    if (tab === 'open') return '📖'
    if (tab === 'mine') return '✍️'
    return '🏁'
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'open', label: 'Rejoindre' },
    { key: 'mine', label: 'Mes histoires' },
    { key: 'done', label: 'Terminées' },
  ]

  const renderEmptyState = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{getEmptyIcon()}</Text>
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
  )

  const renderItem = ({ item, index }: { item: Story; index: number }) => (
    <AnimatedStoryCard
      story={item}
      index={index}
      onPress={() => router.push(`/(app)/story/${item.id}`)}
    />
  )

  return (
    <View style={styles.container}>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#5B4FCF" size="large" />
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
              onRefresh={onRefresh}
              colors={['#5B4FCF']}
              tintColor="#5B4FCF"
            />
          }
          ListEmptyComponent={renderEmptyState}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/story/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5FF',
  },
  tabBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECF8',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0DCF2',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabActive: {
    backgroundColor: '#5B4FCF',
    borderColor: '#5B4FCF',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 100,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#9B8EC4',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: '#5B4FCF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5B4FCF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#5B4FCF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
})