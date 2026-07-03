import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Platform
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../store/authStore'

interface Proposal {
  id: string
  content: string
  author_id: string
  votes_count: number
  is_winner: boolean
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

  const loadData = async () => {
    console.log('🔄 Chargement des données...')
    
    try {
      // 1. Récupérer l'histoire
      const { data: story } = await supabase
        .from('stories')
        .select('creator_id')
        .eq('id', id)
        .single()
      
      if (story) {
        setCreatorId(story.creator_id)
        console.log('📖 Créateur:', story.creator_id)
      }

      // 2. Récupérer le tour actuel
      const { data: paragraphs } = await supabase
        .from('paragraphs')
        .select('turn_number')
        .eq('story_id', id)
        .order('turn_number', { ascending: false })
        .limit(1)
      
      const turn = paragraphs && paragraphs.length > 0 ? paragraphs[0].turn_number + 1 : 1
      setCurrentTurn(turn)
      console.log('🔄 Tour actuel:', turn)

      // 3. Récupérer les propositions avec leurs votes
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select(`
          id,
          content,
          author_id,
          votes_count,
          is_winner,
          author:profiles(pseudo)
        `)
        .eq('story_id', id)
        .eq('turn_number', turn)
        .order('votes_count', { ascending: false })

      if (proposalsError) {
        console.error('❌ Erreur propositions:', proposalsError)
        Alert.alert('Erreur', 'Impossible de charger les propositions')
        return
      }

      console.log('📝 Propositions chargées:', proposalsData?.length || 0)
      setProposals(proposalsData || [])

      // 4. Trouver la proposition de l'utilisateur
      const myProposal = (proposalsData || []).find(p => p.author_id === user?.id)
      setMyProposalId(myProposal?.id || null)

      // 5. Vérifier si l'utilisateur a déjà voté
      const { data: voteData } = await supabase
        .from('votes')
        .select('proposal_id')
        .eq('voter_id', user?.id)
        .eq('story_id', id)
        .eq('turn_number', turn)
        .maybeSingle()

      setMyVote(voteData?.proposal_id || null)
      console.log('🗳️ Vote existant:', voteData?.proposal_id || 'Aucun')

    } catch (error) {
      console.error('❌ Erreur:', error)
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
    
    setLoading(false)
  }

  useEffect(() => {
    if (id && user) {
      loadData()
    }
  }, [id])

  const handleVote = async (proposalId: string) => {
    console.log('🗳️ Vote pour:', proposalId)
    
    if (myVote) {
      Alert.alert('Info', 'Tu as déjà voté pour ce tour.')
      return
    }
    
    if (proposalId === myProposalId) {
      Alert.alert('Info', 'Tu ne peux pas voter pour ta propre proposition.')
      return
    }

    setVoting(true)
    
    try {
      // ÉTAPE 1: Insérer le vote
      console.log('📝 Insertion du vote...')
      const { error: insertError } = await supabase
        .from('votes')
        .insert({
          proposal_id: proposalId,
          voter_id: user?.id,
          story_id: id,
          turn_number: currentTurn,
        })

      if (insertError) {
        console.error('❌ Erreur insertion:', insertError)
        Alert.alert('Erreur', 'Erreur lors du vote: ' + insertError.message)
        setVoting(false)
        return
      }

      console.log('✅ Vote inséré')

      // ÉTAPE 2: Incrémenter le compteur de façon atomique via RPC
      // (remplace l'ancien select + update qui échouait silencieusement à cause de RLS)
      const { error: rpcError } = await supabase
        .rpc('increment_proposal_votes', { proposal_id_input: proposalId })

      if (rpcError) {
        console.error('❌ Erreur incrémentation:', rpcError)
        Alert.alert('Erreur', 'Erreur lors de la mise à jour des votes')
        setVoting(false)
        return
      }

      console.log('✅ Compteur mis à jour')

      // ÉTAPE 3: Mettre à jour l'état local
      setMyVote(proposalId)
      
      // ÉTAPE 4: Recharger les données
      await loadData()
      
      Alert.alert('Succès', 'Ton vote a été enregistré !')

    } catch (error) {
      console.error('❌ Erreur:', error)
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
    
    setVoting(false)
  }

  const closeTurnLogic = async () => {
    setClosing(true)

    try {
      // Trouver le gagnant
      const winner = proposals.reduce((a, b) =>
        (a.votes_count || 0) > (b.votes_count || 0) ? a : b
      )

      console.log('🏆 Gagnant:', winner.id, 'avec', winner.votes_count, 'votes')

      // Ajouter le paragraphe
      const { error: paraError } = await supabase
        .from('paragraphs')
        .insert({
          story_id: id,
          author_id: winner.author_id,
          content: winner.content,
          turn_number: currentTurn,
        })

      if (paraError) {
        console.error('❌ Erreur paragraphe:', paraError)
        Alert.alert('Erreur', paraError.message)
        setClosing(false)
        return
      }

      console.log('✅ Paragraphe ajouté')

      // Marquer la proposition gagnante via RPC
      // (remplace l'ancien update direct qui échouait silencieusement à cause de RLS)
      const { error: winnerError } = await supabase
        .rpc('mark_proposal_winner', { proposal_id_input: winner.id })

      if (winnerError) {
        console.error('❌ Erreur is_winner:', winnerError)
      }

      // Mettre à jour le statut de l'histoire
      await supabase
        .from('stories')
        .update({
          status: 'open',
          turn_started_at: new Date().toISOString()
        })
        .eq('id', id)

      console.log('✅ Tour clôturé')
      Alert.alert('Succès', 'Tour clôturé !')
      router.back()

    } catch (error) {
      console.error('❌ Erreur:', error)
      Alert.alert('Erreur', 'Une erreur est survenue')
    }

    setClosing(false)
  }

  const handleCloseTurn = async () => {
    console.log('🏁 Tentative de clôture')
    
    if (proposals.length === 0) {
      Alert.alert('Info', 'Aucune proposition à clôturer.')
      return
    }

    // Alert.alert avec plusieurs boutons ne fonctionne pas sur le web (expo web).
    // On utilise window.confirm sur web, et Alert.alert natif sur mobile.
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Clôturer le tour ?\n\nLa proposition avec le plus de votes sera ajoutée à l\'histoire.'
      )
      if (confirmed) {
        await closeTurnLogic()
      }
    } else {
      Alert.alert(
        'Clôturer le tour',
        'La proposition avec le plus de votes sera ajoutée à l\'histoire.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Clôturer', onPress: closeTurnLogic }
        ]
      )
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </View>
    )
  }

  const isCreator = user?.id === creatorId
  const totalVotes = proposals.reduce((sum, p) => sum + (p.votes_count || 0), 0)
  console.log('📊 Total votes:', totalVotes)

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} />
      }
    >
      <Text style={styles.title}>
        Tour {currentTurn} — {proposals.length} proposition(s)
      </Text>

      {isCreator && proposals.length > 0 && (
        <TouchableOpacity
          style={[styles.closeBtn, closing && styles.btnDisabled]}
          onPress={handleCloseTurn}
          disabled={closing}
        >
          {closing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.closeBtnText}>🏁 Clore ce tour</Text>
          )}
        </TouchableOpacity>
      )}

      {myVote && (
        <View style={styles.votedBanner}>
          <Text style={styles.votedText}>✅ Tu as voté ce tour.</Text>
        </View>
      )}

      {proposals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⏳</Text>
          <Text style={styles.emptyText}>Aucune proposition pour l'instant</Text>
        </View>
      ) : (
        proposals.map(proposal => {
          const isMyProposal = proposal.author_id === user?.id
          const isMyVote = myVote === proposal.id
          const pct = totalVotes > 0 
            ? Math.round(((proposal.votes_count || 0) / totalVotes) * 100)
            : 0

          return (
            <View key={proposal.id} style={[styles.card, isMyVote && styles.cardVoted]}>
              <View style={styles.cardHeader}>
                <Text style={styles.authorName}>
                  {proposal.author?.pseudo || 'Anonyme'}
                  {isMyProposal ? ' (toi)' : ''}
                </Text>
                <View style={styles.votesBadge}>
                  <Text style={styles.votesCount}>
                    {proposal.votes_count || 0} vote{(proposal.votes_count || 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <Text style={styles.proposalText}>{proposal.content}</Text>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.pctText}>{pct}%</Text>

              {!myVote && !isMyProposal && (
                <TouchableOpacity
                  style={[styles.voteBtn, voting && styles.btnDisabled]}
                  onPress={() => handleVote(proposal.id)}
                  disabled={voting}
                >
                  <Text style={styles.voteBtnText}>
                    {voting ? 'Vote en cours...' : 'Voter pour cette suite'}
                  </Text>
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F8FC', 
    padding: 16 
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1A1A2E', 
    marginBottom: 16 
  },
  closeBtn: {
    backgroundColor: '#FF6B6B', 
    padding: 14, 
    borderRadius: 12,
    alignItems: 'center', 
    marginBottom: 16
  },
  closeBtnText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 15 
  },
  votedBanner: {
    backgroundColor: '#E8F5E9', 
    borderRadius: 10, 
    padding: 12,
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#A5D6A7'
  },
  votedText: { 
    fontSize: 13, 
    color: '#2E7D32' 
  },
  empty: { 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyIcon: { 
    fontSize: 40, 
    marginBottom: 12 
  },
  emptyText: { 
    fontSize: 15, 
    color: '#999' 
  },
  card: {
    backgroundColor: '#fff', 
    borderRadius: 14, 
    padding: 16,
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#EBEBEB'
  },
  cardVoted: { 
    borderColor: '#7F77DD', 
    borderWidth: 2 
  },
  cardHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 10
  },
  authorName: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#7F77DD' 
  },
  votesBadge: {
    backgroundColor: '#EEEDFE', 
    paddingHorizontal: 10,
    paddingVertical: 3, 
    borderRadius: 10
  },
  votesCount: { 
    fontSize: 12, 
    color: '#7F77DD', 
    fontWeight: '600' 
  },
  proposalText: { 
    fontSize: 15, 
    color: '#1A1A2E', 
    lineHeight: 24, 
    marginBottom: 12 
  },
  progressBar: {
    height: 6, 
    backgroundColor: '#F0F0F0',
    borderRadius: 3, 
    overflow: 'hidden', 
    marginBottom: 4
  },
  progressFill: { 
    height: 6, 
    backgroundColor: '#7F77DD', 
    borderRadius: 3 
  },
  pctText: { 
    fontSize: 11, 
    color: '#AAA', 
    marginBottom: 12 
  },
  voteBtn: {
    backgroundColor: '#7F77DD', 
    padding: 12,
    borderRadius: 10, 
    alignItems: 'center'
  },
  btnDisabled: { 
    opacity: 0.5 
  },
  voteBtnText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14 
  },
  myVoteBadge: {
    backgroundColor: '#E8F5E9', 
    padding: 8,
    borderRadius: 8, 
    alignItems: 'center'
  },
  myVoteText: { 
    color: '#388E3C', 
    fontWeight: '600', 
    fontSize: 13 
  },
  backBtn: { 
    alignItems: 'center', 
    padding: 16 
  },
  backBtnText: { 
    color: '#7F77DD', 
    fontSize: 14 
  },
})