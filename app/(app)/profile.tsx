import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

type Stats = { total: number; won: number }

export default function Profile() {
  const { user, profile, signOut } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ total: 0, won: 0 })
  const [loading, setLoading] = useState(true)

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

  const badges = [
    { min: 1, icon: 'create-outline' as const, label: 'Premier pas', desc: 'Première contribution' },
    { min: 5, icon: 'star' as const, label: 'Plume d\'argent', desc: '5 points de réputation' },
    { min: 10, icon: 'trophy' as const, label: 'Plume d\'or', desc: '10 points de réputation' },
    { min: 20, icon: 'ribbon' as const, label: 'Maître conteur', desc: '20 points de réputation' },
  ]

  const earned = badges.filter(b => (profile?.reputation ?? 0) >= b.min)
  const locked = badges.filter(b => (profile?.reputation ?? 0) < b.min)

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B4FCF" />
      </View>
    )
  }

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
        <View style={styles.repBadge}>
          <Ionicons name="star" size={13} color="#5B4FCF" />
          <Text style={styles.repText}>{profile?.reputation ?? 0} pts</Text>
        </View>
      </View>

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

      {/* Badges obtenus */}
      {earned.length > 0 && (
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>Badges obtenus</Text>
          <View style={styles.badgesGrid}>
            {earned.map(badge => (
              <View key={badge.label} style={styles.badgeCard}>
                <View style={styles.badgeIconWrap}>
                  <Ionicons name={badge.icon} size={24} color="#5B4FCF" />
                </View>
                <Text style={styles.badgeLabel}>{badge.label}</Text>
                <Text style={styles.badgeDesc}>{badge.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Badges verrouillés */}
      {locked.length > 0 && (
        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>À débloquer</Text>
          <View style={styles.badgesGrid}>
            {locked.map(badge => (
              <View key={badge.label} style={[styles.badgeCard, styles.badgeCardLocked]}>
                <View style={[styles.badgeIconWrap, styles.badgeIconWrapLocked]}>
                  <Ionicons name={badge.icon} size={24} color="#C4B8E8" />
                </View>
                <Text style={[styles.badgeLabel, styles.badgeLabelLocked]}>
                  {badge.label}
                </Text>
                <Text style={styles.badgeDesc}>{badge.min} pts requis</Text>
              </View>
            ))}
          </View>
        </View>
      )}

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
    alignItems: 'center', paddingVertical: 40,
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
    backgroundColor: '#F5F3FF', paddingHorizontal: 16,
    paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#E8E4F8',
  },
  repText: { fontSize: 14, fontWeight: '700', color: '#5B4FCF' },
  statsSection: { padding: 20 },
  sectionTitle: {
    fontSize: 12.5, fontWeight: '700', color: '#9B8EC4',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
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
  badgesSection: { paddingHorizontal: 20, paddingBottom: 8 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', minWidth: '45%', flex: 1,
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  badgeIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  badgeIconWrapLocked: { backgroundColor: '#F7F5FF' },
  badgeCardLocked: { backgroundColor: '#F7F5FF', borderWidth: 1, borderColor: '#E8E4F8' },
  badgeLabel: { fontSize: 13, fontWeight: '700', color: '#1A1033', marginBottom: 4 },
  badgeLabelLocked: { color: '#9B8EC4' },
  badgeDesc: { fontSize: 11, color: '#9B8EC4', textAlign: 'center' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 20, padding: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  signOutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
})