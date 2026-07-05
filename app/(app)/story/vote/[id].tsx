import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Platform
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../store/authStore'

interface Proposal {
  id: string; content: string; author_id: string
  votes_count: number; is_winner: boolean
  author: { pseudo: string }
}

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
  const [live, setLive] = useState(false)

  const loadData = useCallback(async () => {
    const { data: story } = await supabase
      .from('stories').select('creator_id').eq('id', id).single()
    if (story) setCreatorId(story.creator_id)

    const { data: paragraphs } = await supabase
      .from('paragraphs').select('turn_number').eq('story_id', id)
      .order('turn_number', { ascending: false }).limit(1)
    const turn = paragraphs && paragraphs.length > 0 ? paragraphs[0].turn_number + 1 : 1
    setCurrentTurn(turn)

    const { data: proposalsData } = await supabase
      .from('proposals')
      .select('id, content, author_id, votes_count, is_winner, author:profiles(pseudo)')
      .eq('story_id', id).eq('turn_number', turn)
      .order('votes_count', { ascending: false })
    setProposals(proposalsData || [])

    const mine = (proposalsData || []).find(p => p.author_id === user?.id)
    setMyProposalId(mine?.id || null)

    const { data: voteData } = await supabase
      .from('votes').select('proposal_id')
      .eq('voter_id', user?.id).eq('story_id', id).eq('turn_number', turn)
      .maybeSingle()
    setMyVote(voteData?.proposal_id || null)

    setLoading(false)
  }, [id, user?.id])

  useEffect(() => { if (id && user) loadData() }, [id, user, loadData])

  // Temps réel : les votes et propositions se mettent à jour en direct
  // pour tout le monde, sans avoir besoin de tirer pour rafraîchir.
  useEffect(() => {
    if (!id || !user) return

    const channel = supabase
      .channel(`vote-turn-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `story_id=eq.${id}` },
        () => { loadData() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals', filter: `story_id=eq.${id}` },
        () => { loadData() }
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, user, loadData])

  const handleVote = async (proposalId: string) => {
    if (myVote || proposalId === myProposalId) return
    setVoting(true)
    const { error } = await supabase.from('votes').insert({
      proposal_id: proposalId, voter_id: user?.id,
      story_id: id, turn_number: currentTurn,
    })
    if (!error) {
      await supabase.rpc('increment_votes', { proposal_id: proposalId })
      setMyVote(proposalId)
      await loadData()
    }
    setVoting(false)
  }

  const handleCloseTurn = async () => {
    if (proposals.length === 0) return
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Clore ce tour ? La proposition gagnante sera ajoutée.')
      : true
    if (!confirmed) return

    setClosing(true)
    const { error } = await supabase.rpc('close_turn', {
      p_story_id: id, p_turn_number: currentTurn,
    })
    setClosing(false)
    if (error) {
      if (Platform.OS === 'web') window.alert('Erreur : ' + error.message)
    } else {
      if (Platform.OS === 'web') window.alert('Tour clôturé !')
      router.back()
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B4FCF" />
      </View>
    )
  }

  const isCreator = user?.id === creatorId
  const totalVotes = proposals.reduce((s, p) => s + (p.votes_count || 0), 0)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false) }}
          colors={['#5B4FCF']} tintColor="#5B4FCF"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Retour */}
      <TouchableOpacity
        style={styles.topBackBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={20} color="#5B4FCF" />
        <Text style={styles.topBackBtnText}>Retour</Text>
      </TouchableOpacity>

      {live && (
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.livePillText}>Mis à jour en direct</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.pageHeader}>
        <View style={styles.tourPill}>
          <Ionicons name="git-branch-outline" size={13} color="#fff" />
          <Text style={styles.tourPillText}>Tour {currentTurn}</Text>
        </View>
        <Text style={styles.pageTitle}>
          {proposals.length} proposition{proposals.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.pageSub}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} au total
        </Text>
      </View>

      {/* Bouton clore */}
      {isCreator && proposals.length > 0 && (
        <TouchableOpacity
          style={[styles.closeBtn, closing && styles.closeBtnDisabled]}
          onPress={handleCloseTurn}
          disabled={closing}
          activeOpacity={0.85}
        >
          {closing
            ? <ActivityIndicator color="#fff" size="small" />
            : (
              <View style={styles.closeBtnContent}>
                <Ionicons name="flag-outline" size={18} color="#fff" />
                <Text style={styles.closeBtnText}>Clore ce tour</Text>
              </View>
            )
          }
        </TouchableOpacity>
      )}

      {/* Banner vote */}
      {myVote && (
        <View style={styles.votedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#15803D" />
          <Text style={styles.votedText}>
            Ton vote est enregistré. Les résultats se mettent à jour en direct.
          </Text>
        </View>
      )}

      {/* Propositions */}
      {proposals.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="hourglass-outline" size={36} color="#B8AED8" />
          </View>
          <Text style={styles.emptyTitle}>Aucune proposition</Text>
          <Text style={styles.emptyText}>
            Les participants n'ont pas encore soumis de suite.
          </Text>
        </View>
      ) : (
        proposals.map((proposal, idx) => {
          const isMyProposal = proposal.author_id === user?.id
          const isMyVote = myVote === proposal.id
          const pct = totalVotes > 0
            ? Math.round(((proposal.votes_count || 0) / totalVotes) * 100)
            : 0
          const isLeading = idx === 0 && (proposal.votes_count || 0) > 0

          return (
            <View
              key={proposal.id}
              style={[
                styles.proposalCard,
                isMyVote && styles.proposalCardVoted,
                isLeading && styles.proposalCardLeading,
              ]}
            >
              {isLeading && (
                <View style={styles.leadingBadge}>
                  <Ionicons name="trophy" size={13} color="#D97706" />
                  <Text style={styles.leadingText}>En tête</Text>
                </View>
              )}

              <View style={styles.proposalHeader}>
                <View style={styles.authorInfo}>
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorAvatarText}>
                      {proposal.author?.pseudo?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <Text style={styles.authorName}>
                    {proposal.author?.pseudo ?? 'Anonyme'}
                    {isMyProposal ? ' · toi' : ''}
                  </Text>
                </View>
                <View style={styles.votesBadge}>
                  <Text style={styles.votesCount}>
                    {proposal.votes_count || 0} vote{(proposal.votes_count || 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <Text style={styles.proposalText}>{proposal.content}</Text>

              {/* Barre de vote */}
              <View style={styles.voteBar}>
                <View style={styles.voteBarBg}>
                  <View style={[
                    styles.voteBarFill,
                    { width: `${pct}%` as any },
                    isMyVote && styles.voteBarFillVoted,
                  ]} />
                </View>
                <Text style={[styles.pctText, isMyVote && styles.pctTextVoted]}>
                  {pct}%
                </Text>
              </View>

              {/* Action */}
              {!myVote && !isMyProposal && (
                <TouchableOpacity
                  style={[styles.voteBtn, voting && styles.voteBtnDisabled]}
                  onPress={() => handleVote(proposal.id)}
                  disabled={voting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.voteBtnText}>
                    {voting ? 'Envoi...' : 'Voter pour cette suite'}
                  </Text>
                </TouchableOpacity>
              )}

              {isMyProposal && !myVote && (
                <View style={styles.ownProposalBadge}>
                  <Text style={styles.ownProposalText}>
                    Ta proposition — attends les votes des autres
                  </Text>
                </View>
              )}

              {isMyVote && (
                <View style={styles.myVoteBadge}>
                  <Ionicons name="checkmark-circle" size={15} color="#15803D" />
                  <Text style={styles.myVoteText}>Tu as voté pour cette suite</Text>
                </View>
              )}
            </View>
          )
        })
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={15} color="#5B4FCF" />
        <Text style={styles.backBtnText}>Retour à l'histoire</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  topBackBtnText: { color: '#5B4FCF', fontSize: 15, fontWeight: '600' },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: '#F0FDF4',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    marginBottom: 14, borderWidth: 1, borderColor: '#BBF7D0',
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E',
  },
  livePillText: { fontSize: 11, color: '#15803D', fontWeight: '700' },
  pageHeader: { marginBottom: 20 },
  tourPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: '#5B4FCF',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginBottom: 10,
  },
  tourPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pageTitle: {
    fontFamily: 'Georgia',
    fontSize: 24, fontWeight: '700', color: '#1A1033',
    letterSpacing: -0.5, marginBottom: 4,
  },
  pageSub: { fontSize: 14, color: '#9B8EC4' },
  closeBtn: {
    backgroundColor: '#EF4444', padding: 16, borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  closeBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  closeBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  votedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0',
  },
  votedText: { fontSize: 13, color: '#15803D', flex: 1, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1.5, borderColor: '#E8E4F8',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1033', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#9B8EC4', textAlign: 'center' },
  proposalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 14, borderWidth: 1.5, borderColor: '#F0ECF8',
    shadowColor: '#1A1033', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  proposalCardVoted: { borderColor: '#5B4FCF' },
  proposalCardLeading: { borderColor: '#F59E0B' },
  leadingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', backgroundColor: '#FFFBEB',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, marginBottom: 10,
  },
  leadingText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  proposalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
  },
  authorAvatarText: { fontSize: 14, fontWeight: '700', color: '#5B4FCF' },
  authorName: { fontSize: 14, fontWeight: '600', color: '#1A1033' },
  votesBadge: {
    backgroundColor: '#F5F3FF', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10,
  },
  votesCount: { fontSize: 12, fontWeight: '700', color: '#5B4FCF' },
  proposalText: {
    fontSize: 15, color: '#1A1033', lineHeight: 24, marginBottom: 14,
  },
  voteBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  voteBarBg: {
    flex: 1, height: 8, backgroundColor: '#F0ECF8',
    borderRadius: 4, overflow: 'hidden',
  },
  voteBarFill: { height: 8, backgroundColor: '#C4B8E8', borderRadius: 4 },
  voteBarFillVoted: { backgroundColor: '#5B4FCF' },
  pctText: { fontSize: 13, color: '#9B8EC4', fontWeight: '600', minWidth: 36 },
  pctTextVoted: { color: '#5B4FCF' },
  voteBtn: {
    backgroundColor: '#5B4FCF', padding: 14, borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#5B4FCF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  voteBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  voteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ownProposalBadge: {
    backgroundColor: '#F7F5FF', padding: 12, borderRadius: 12, alignItems: 'center',
  },
  ownProposalText: { fontSize: 13, color: '#9B8EC4' },
  myVoteBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  myVoteText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 20 },
  backBtnText: { color: '#5B4FCF', fontSize: 14, fontWeight: '600' },
})