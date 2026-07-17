import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useReputation } from '../../hooks/useReputation'
import BadgeSystem from '../../components/BadgeSystem'

type Stats = { total: number; won: number }

export default function Profile() {
  const { user, profile, signOut } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ total: 0, won: 0 })
  const [loading, setLoading] = useState(true)
  
  // Utiliser le hook de réputation
  const { 
    stats: repStats, 
    badges, 
    userBadges, 
    loading: repLoading,
    checkAndAwardBadges 
  } = useReputation(user?.id || '')

  useEffect(() => {
    if (!user) return
    const loadStats = async () => {
      try {
        const { count: total } = await supabase
          .from('proposals').select('*', { count: 'exact', head: true })
          .eq('author_id', user.id)
        const { count: won } = await supabase
          .from('proposals').select('*', { count: 'exact', head: true })
          .eq('author_id', user.id).eq('is_winner', true)
        setStats({ total: total ?? 0, won: won ?? 0 })
      } catch (error) {
        console.error('Erreur stats:', error)
      }
      setLoading(false)
    }
    loadStats()
  }, [user])

  // Vérifier les badges après le chargement
  useEffect(() => {
    if (!repLoading && repStats) {
      checkAndAwardBadges()
    }
  }, [repLoading, repStats])

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Tu veux vraiment te déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', onPress: () => signOut(), style: 'destructive' }
      ]
    )
  }

  const winRate = stats.total > 0
    ? Math.round((stats.won / stats.total) * 100)
    : 0

  if (loading || repLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B4FCF" />
      </View>
    )
  }

  const earnedCount = userBadges.length
  const totalBadges = badges.length

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero profil */}
      <View style={styles.hero}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.pseudo?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        </View>
        <Text style={styles.pseudo}>{profile?.pseudo ?? 'Utilisateur'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        
        {/* Réputation */}
        <View style={styles.repBadge}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.repText}>
            {repStats?.reputation || 0} points de réputation
          </Text>
        </View>

        {/* Badges count */}
        <View style={styles.badgeCountContainer}>
          <Ionicons name="ribbon-outline" size={14} color="#5B4FCF" />
          <Text style={styles.badgeCountText}>
            {earnedCount} badge{earnedCount !== 1 ? 's' : ''} débloqué{earnedCount !== 1 ? 's' : ''} sur {totalBadges}
          </Text>
        </View>
      </View>

      {/* Badges */}
      {badges.length > 0 && (
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>🏅 Badges</Text>
          <BadgeSystem badges={badges} userBadges={userBadges} />
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Statistiques</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Propositions</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statNumber, styles.statNumberWhite]}>
              {stats.won}
            </Text>
            <Text style={[styles.statLabel, styles.statLabelWhite]}>
              Retenues
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{winRate}%</Text>
            <Text style={styles.statLabel}>Taux succès</Text>
          </View>
        </View>
      </View>

      {/* Stats détaillées */}
      <View style={styles.detailedStats}>
        <Text style={styles.sectionTitle}>📊 Détails</Text>
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="create-outline" size={18} color="#5B4FCF" />
            <Text style={styles.detailLabel}>Histoires créées</Text>
            <Text style={styles.detailValue}>{repStats?.stories_created || 0}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={18} color="#5B4FCF" />
            <Text style={styles.detailLabel}>Participations</Text>
            <Text style={styles.detailValue}>{repStats?.stories_participated || 0}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="thumbs-up-outline" size={18} color="#5B4FCF" />
            <Text style={styles.detailLabel}>Votes reçus</Text>
            <Text style={styles.detailValue}>{repStats?.votes_received || 0}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="chatbubble-outline" size={18} color="#5B4FCF" />
            <Text style={styles.detailLabel}>Commentaires</Text>
            <Text style={styles.detailValue}>{repStats?.comments_made || 0}</Text>
          </View>
        </View>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={17} color="#EF4444" />
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
  },
  avatarRing: {
    width: 96, height: 96, borderRadius: 32,
    borderWidth: 3, borderColor: '#E8E4F8',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 28,
    backgroundColor: '#5B4FCF', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  pseudo: {
    fontFamily: 'Georgia',
    fontSize: 24, fontWeight: '700', color: '#1A1033',
    letterSpacing: -0.5, marginBottom: 4,
  },
  email: { fontSize: 14, color: '#9B8EC4', marginBottom: 12 },
  repBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', paddingHorizontal: 16,
    paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#FDE68A',
    marginBottom: 8,
  },
  repText: { fontSize: 14, fontWeight: '700', color: '#D97706' },
  badgeCountContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F3FF', paddingHorizontal: 14,
    paddingVertical: 5, borderRadius: 16,
  },
  badgeCountText: { fontSize: 12, color: '#5B4FCF', fontWeight: '600' },
  badgesSection: { padding: 20 },
  sectionTitle: {
    fontSize: 12.5, fontWeight: '700', color: '#9B8EC4',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  statsSection: { paddingHorizontal: 20, paddingBottom: 8 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 16, alignItems: 'center',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statCardAccent: { backgroundColor: '#5B4FCF' },
  statNumber: {
    fontSize: 26, fontWeight: '800', color: '#1A1033', marginBottom: 4,
  },
  statNumberWhite: { color: '#fff' },
  statLabel: { fontSize: 11, color: '#9B8EC4', fontWeight: '600' },
  statLabelWhite: { color: 'rgba(255,255,255,0.8)' },
  detailedStats: { padding: 20 },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#1A1033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  detailLabel: {
    flex: 1,
    fontSize: 12,
    color: '#9B8EC4',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1033',
  },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 20, padding: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  signOutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
})