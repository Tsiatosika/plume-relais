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
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadProposals = async () => {
  // Récupère l'histoire pour savoir le créateur
  const { data: story } = await supabase
    .from('stories').select('creator_id').eq('id', id).single()
  if (story) setCreatorId(story.creator_id)

  // Dernier tour — sans .single() pour éviter l'erreur si vide
  const { data: paraList } = await supabase
    .from('paragraphs').select('turn_number')
    .eq('story_id', id)
    .order('turn_number', { ascending: false })
    .limit(1)
  const turn = paraList && paraList.length > 0 ? paraList[0].turn_number + 1 : 1
  setCurrentTurn(turn)

  // Charge les propositions
  const { data } = await supabase
    .from('proposals')
    .select('*, author:profiles(pseudo)')
    .eq('story_id', id)
    .eq('turn_number', turn)
    .order('votes_count', { ascending: false })
  setProposals(data ?? [])

  // Ma proposition
  const mine = (data ?? []).find(p => p.author_id === user?.id)
  if (mine) setMyProposalId(mine.id)
  else setMyProposalId(null)

  // Mon vote ce tour
  const { data: voteList } = await supabase
    .from('votes').select('proposal_id')
    .eq('story_id', id).eq('voter_id', user.id)
    .eq('turn_number', turn)
  if (voteList && voteList.length > 0) {
    setMyVote(voteList[0].proposal_id)
  } else {
    setMyVote(null)
  }

  setLoading(false)
}

  useEffect(() => { loadProposals() }, [id])

  useRealtimeStory(id, loadProposals, loadProposals, loadProposals)

  const handleVote = async (proposalId: string) => {
    if (myVote) return
    if (proposalId === myProposalId) return

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
    }
    setVoting(false)
  }

  const handleCloseTurn = async () => {
      if (proposals.length === 0) return

      const confirmed = window.confirm(
        'Clore le tour ? La proposition avec le plus de votes sera ajoutée à l\'histoire.'
      )
      if (!confirmed) return

      setClosing(true)
      const { error } = await supabase.rpc('close_turn', {
        p_story_id: id,
        p_turn_number: currentTurn,
      })
      setClosing(false)

      if (error) {
        window.alert('Erreur : ' + error.message)
      } else {
        window.alert('Tour clôturé ! La suite gagnante a été ajoutée.')
        router.back()
      }
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

  const isCreator = user.id === creatorId

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={['#7F77DD']} />
      }
    >
      <Text style={styles.title}>
        Tour {currentTurn} — {proposals.length} proposition(s)
      </Text>

      {/* Bouton clore le tour — visible uniquement par le créateur */}
      {isCreator && proposals.length > 0 && (
        <TouchableOpacity
          style={[styles.closeBtn, closing && styles.btnDisabled]}
          onPress={handleCloseTurn}
          disabled={closing}
        >
          {closing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.closeBtnText}>🏁 Clore ce tour</Text>
          }
        </TouchableOpacity>
      )}

      {myVote && (
        <View style={styles.votedBanner}>
          <Text style={styles.votedText}>
            ✅ Tu as voté ce tour. Les votes se mettent à jour en direct.
          </Text>
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

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.pctText}>{pct}%</Text>

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
  closeBtn: {
    backgroundColor: '#FF6B6B', padding: 14, borderRadius: 12,
    alignItems: 'center', marginBottom: 16
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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