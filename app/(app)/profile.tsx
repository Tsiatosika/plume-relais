import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

type Stats = { total: number; won: number }

export default function Profile() {
  const { user, profile, signOut } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ total: 0, won: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      const { count: total } = await supabase
        .from('proposals').select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)

      const { count: won } = await supabase
        .from('proposals').select('*', { count: 'exact', head: true })
        .eq('author_id', user.id).eq('is_winner', true)

      setStats({ total: total ?? 0, won: won ?? 0 })
      setLoading(false)
    }
    loadStats()
  }, [])

  const handleSignOut = () => {
    const confirmed = window.confirm('Tu veux vraiment te déconnecter ?')
    if (confirmed) signOut()
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.pseudo?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.pseudo}>{profile?.pseudo ?? 'Utilisateur'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Propositions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.won}</Text>
          <Text style={styles.statLabel}>Retenues</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profile?.reputation ?? 0}</Text>
          <Text style={styles.statLabel}>Réputation</Text>
        </View>
      </View>

      {(profile?.reputation ?? 0) >= 5 && (
        <View style={styles.badgeSection}>
          <Text style={styles.badgeSectionTitle}>Badges</Text>
          <View style={styles.badgeRow}>
            {(profile?.reputation ?? 0) >= 5 && (
              <View style={styles.badge}>
                <Text style={styles.badgeEmoji}>✍️</Text>
                <Text style={styles.badgeLabel}>Plume d'argent</Text>
              </View>
            )}
            {(profile?.reputation ?? 0) >= 10 && (
              <View style={styles.badge}>
                <Text style={styles.badgeEmoji}>🏆</Text>
                <Text style={styles.badgeLabel}>Plume d'or</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarSection: {
    alignItems: 'center', paddingVertical: 36, backgroundColor: '#fff'
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEEDFE', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#7F77DD' },
  pseudo: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  email: { fontSize: 14, color: '#AAA' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#EBEBEB'
  },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#7F77DD' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  badgeSection: { padding: 16 },
  badgeSectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12
  },
  badgeRow: { flexDirection: 'row', gap: 12 },
  badge: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB', flex: 1
  },
  badgeEmoji: { fontSize: 28, marginBottom: 6 },
  badgeLabel: { fontSize: 12, color: '#555', fontWeight: '500' },
  signOutBtn: {
    margin: 16, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#FF5252', alignItems: 'center'
  },
  signOutText: { color: '#FF5252', fontWeight: '600', fontSize: 16 },
})