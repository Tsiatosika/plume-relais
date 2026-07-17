import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Badge {
  id: string
  name: string
  icon: string
  description: string
  category: 'contribution' | 'quality' | 'social' | 'special'
  requirement_type: 'reputation' | 'stories_created' | 'stories_participated' | 'votes_received' | 'comments_made' | 'special'
  requirement_value: number
  color: string
  is_secret: boolean
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge: Badge
}

export interface ReputationStats {
  total_proposals: number
  won_proposals: number
  stories_created: number
  stories_participated: number
  votes_received: number
  comments_made: number
  reputation: number
}

export function useReputation(userId: string) {
  const [stats, setStats] = useState<ReputationStats | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)

  const loadReputation = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // 1. Récupérer les statistiques
      const { data: profile } = await supabase
        .from('profiles')
        .select('reputation, stories_created, stories_participated, votes_received, comments_made')
        .eq('id', userId)
        .single()

      // 2. Récupérer les propositions
      const { count: totalProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)

      const { count: wonProposals } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('is_winner', true)

      // 3. Récupérer les commentaires
      const { count: commentsMade } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      setStats({
        total_proposals: totalProposals || 0,
        won_proposals: wonProposals || 0,
        stories_created: profile?.stories_created || 0,
        stories_participated: profile?.stories_participated || 0,
        votes_received: profile?.votes_received || 0,
        comments_made: commentsMade || 0,
        reputation: profile?.reputation || 0,
      })

      // 4. Récupérer les badges de l'utilisateur
      const { data: userBadgesData } = await supabase
        .from('user_badges')
        .select(`
          id,
          user_id,
          badge_id,
          earned_at,
          badge:badges(*)
        `)
        .eq('user_id', userId)

      setUserBadges(userBadgesData || [])

      // 5. Récupérer tous les badges disponibles
      const { data: allBadges } = await supabase
        .from('badges')
        .select('*')
        .order('requirement_value', { ascending: true })

      setBadges(allBadges || [])

    } catch (error) {
      console.error('Erreur chargement réputation:', error)
    }
    setLoading(false)
  }, [userId])

  const checkAndAwardBadges = useCallback(async () => {
    if (!stats || !userId) return

    try {
      // Vérifier quels badges peuvent être débloqués
      const earnedBadgeIds = userBadges.map(ub => ub.badge_id)

      for (const badge of badges) {
        // Ignorer si déjà débloqué
        if (earnedBadgeIds.includes(badge.id)) continue

        let isEligible = false

        switch (badge.requirement_type) {
          case 'reputation':
            isEligible = stats.reputation >= badge.requirement_value
            break
          case 'stories_created':
            isEligible = stats.stories_created >= badge.requirement_value
            break
          case 'stories_participated':
            isEligible = stats.stories_participated >= badge.requirement_value
            break
          case 'votes_received':
            isEligible = stats.votes_received >= badge.requirement_value
            break
          case 'comments_made':
            isEligible = stats.comments_made >= badge.requirement_value
            break
          case 'special':
            // Badges spéciaux (ex: premier vote, première histoire)
            isEligible = true // À implémenter selon la logique
            break
        }

        if (isEligible) {
          // Attribuer le badge
          const { error } = await supabase
            .from('user_badges')
            .insert({
              user_id: userId,
              badge_id: badge.id,
            })

          if (!error) {
            console.log(`🏅 Badge débloqué: ${badge.name}`)
            // Recharger les badges
            await loadReputation()
          }
        }
      }
    } catch (error) {
      console.error('Erreur vérification badges:', error)
    }
  }, [userId, stats, badges, userBadges, loadReputation])

  useEffect(() => {
    loadReputation()
  }, [userId])

  return {
    stats,
    badges,
    userBadges,
    loading,
    loadReputation,
    checkAndAwardBadges,
  }
}