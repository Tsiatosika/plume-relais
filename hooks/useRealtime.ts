import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeStory(
  storyId: string,
  onParagraph: () => void,
  onProposal: () => void,
  onVote: () => void
) {
  const channelRef = useRef<any>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!storyId) return

    // Nettoie le channel précédent s'il existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Créer un nouveau channel
    const channelName = `story-${storyId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)

    // AJOUTER LES CALLBACKS AVANT LE SUBSCRIBE
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'paragraphs',
      filter: `story_id=eq.${storyId}`
    }, (payload) => {
      console.log('📝 Nouveau paragraphe:', payload)
      if (mountedRef.current) onParagraph()
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'proposals',
      filter: `story_id=eq.${storyId}`
    }, (payload) => {
      console.log('💡 Nouvelle proposition:', payload)
      if (mountedRef.current) onProposal()
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'votes',
      filter: `story_id=eq.${storyId}`
    }, (payload) => {
      console.log('🗳️ Nouveau vote:', payload)
      if (mountedRef.current) onVote()
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`📡 Channel ${channelName} subscribed`)
      }
    })

    channelRef.current = channel

    // Nettoyage
    return () => {
      if (channelRef.current) {
        console.log(`🔌 Unsubscribing from ${channelRef.current.topic}`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [storyId, onParagraph, onProposal, onVote])
}