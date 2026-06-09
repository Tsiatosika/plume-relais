import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../store/authStore'
import { useRealtimeStory } from '../../../../hooks/useRealtime'
import { Proposal } from '../../../../types'

export default function VoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()

  const [proposals, setProposals] = useState<Proposal[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [myProposalId, setMyProposalId] = useState<string | null>(null)
  const [currentTurn, setCurrentTurn] = useState(1)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadProposals = async () => {
    const { data: lastPara } = await supabase
      .from('paragraphs').select('turn_number')
      .eq('story_id', id)
      .order('turn_number', { ascending: false })
      .limit(1).single()
    const turn = (lastPara?.turn_number ?? 0) + 1
    setCurrentTurn(turn)

    const { data } = await supabase
      .from('proposals')
      .select('*, author:profiles(pseudo)')
      .eq('story_id', id)
      .eq('turn_number', turn)
      .order('votes_count', { ascending: false })
    setProposals(data ?? [])

    const mine = data?.find(p => p.author_id === user.id)
    if (mine) setMyProposalId(mine.id)

    const { data: voteData } = await supabase
      .from('votes').select('proposal_id')
      .eq('story_id', id).eq('voter_id', user.id)
      .eq('turn_number', turn).single()
    if (voteData) setMyVote(voteData.proposal_id)

    setLoading(false)
  }

  useEffect(() => { loadProposals() }, [id])

  useRealtimeStory(id, loadProposals, loadProposals, loadProposals)

  const handleVote = async (proposalId: string) => {
    if (myVote) return Alert.alert('Déjà voté', 'Tu as déjà voté ce tour.')
    if (proposalId === myProposalId)
      return Alert.alert('Interdit', 'Tu ne peux pas voter pour ta propre proposition.')

    setVoting(true)
    const { error } = await supabase.from('votes').insert({
      proposal_id: proposalId,
      voter_id: user.id,
      story_id: id,
      turn_number: currentTurn,
    })

    if (!error) {
      await supabase.rpc('increment_votes', { proposal_id: proposalId })
      setMyVote(proposalId)
      loadProposals()
    } else {
      Alert.alert('Erreur', error.message)
    }
    setVoting(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadProposals()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={['#7F77DD']} />
      }
    >
      <Text style={styles.title}>Tour {currentTurn} — {proposals.length} proposition(s)</Text>

      {myVote && (
        <View style={styles.votedBanner}>
          <Text style={styles.votedText}>✅ Tu as voté ce tour. Les votes se mettent à jour en direct.</Text>
        </View>
      )}

      {proposals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⏳</Text>
          <Text style={styles.emptyText}>Aucune proposition pour l'instant</Text>
        </View>
      ) : (
        proposals.map(proposal => {
          const isMyProposal = proposal.author_id === user.id
          const isMyVote = myVote === proposal.id
          const totalVotes = proposals.reduce((s, p) => s + p.votes_count, 0)
          const pct = totalVotes > 0
            ? Math.round((proposal.votes_count / totalVotes) * 100)
            : 0

          return (
            <View key={proposal.id}
              style={[styles.card, isMyVote && styles.cardVoted]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.authorName}>
                  {(proposal.author as any)?.pseudo ?? 'Anonyme'}
                  {isMyProposal ? ' (toi)' : ''}
                </Text>
                <View style={styles.votesBadge}>
                  <Text style={styles.votesCount}>
                    {proposal.votes_count} vote{proposal.votes_count !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <Text style={styles.proposalText}>{proposal.content}</Text>

              {/* Barre de progression */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.pctText}>{pct}%</Text>

              {/* Bouton voter */}
              {!myVote && !isMyProposal && (
                <TouchableOpacity
                  style={[styles.voteBtn, voting && styles.btnDisabled]}
                  onPress={() => handleVote(proposal.id)}
                  disabled={voting}
                >
                  <Text style={styles.voteBtnText}>Voter pour cette suite</Text>
                </TouchableOpacity>
              )}

              {isMyVote && (
                <View style={styles.myVoteBadge}>
                  <Text style={styles.myVoteText}>✅ Ton vote</Text>
                </View>
              )}
            </View>
          )
        })
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Retour à l'histoire</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FC', padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  votedBanner: {
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#A5D6A7'
  },
  votedText: { fontSize: 13, color: '#2E7D32' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#EBEBEB'
  },
  cardVoted: { borderColor: '#7F77DD', borderWidth: 2 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10
  },
  authorName: { fontSize: 13, fontWeight: '600', color: '#7F77DD' },
  votesBadge: {
    backgroundColor: '#EEEDFE', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 10
  },
  votesCount: { fontSize: 12, color: '#7F77DD', fontWeight: '600' },
  proposalText: { fontSize: 15, color: '#1A1A2E', lineHeight: 24, marginBottom: 12 },
  progressBar: {
    height: 6, backgroundColor: '#F0F0F0',
    borderRadius: 3, overflow: 'hidden', marginBottom: 4
  },
  progressFill: { height: 6, backgroundColor: '#7F77DD', borderRadius: 3 },
  pctText: { fontSize: 11, color: '#AAA', marginBottom: 12 },
  voteBtn: {
    backgroundColor: '#7F77DD', padding: 12,
    borderRadius: 10, alignItems: 'center'
  },
  btnDisabled: { opacity: 0.5 },
  voteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  myVoteBadge: {
    backgroundColor: '#E8F5E9', padding: 8,
    borderRadius: 8, alignItems: 'center'
  },
  myVoteText: { color: '#388E3C', fontWeight: '600', fontSize: 13 },
  backBtn: { alignItems: 'center', padding: 16 },
  backBtnText: { color: '#7F77DD', fontSize: 14 },
})