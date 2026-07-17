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
  const callbacksRef = useRef({ onParagraph, onProposal, onVote })

  // Mettre à jour les callbacks sans recréer le channel
  useEffect(() => {
    callbacksRef.current = { onParagraph, onProposal, onVote }
  }, [onParagraph, onProposal, onVote])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!storyId) return

    // Nettoyer le channel précédent
    const cleanup = () => {
      if (channelRef.current) {
        console.log(`🔌 Unsubscribing from ${channelRef.current.topic}`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }

    cleanup()

    // Créer un nouveau channel avec un nom unique mais stable
    const channelName = `story-${storyId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'paragraphs',
        filter: `story_id=eq.${storyId}`
      }, () => {
        if (mountedRef.current) {
          callbacksRef.current.onParagraph()
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'proposals',
        filter: `story_id=eq.${storyId}`
      }, () => {
        if (mountedRef.current) {
          callbacksRef.current.onProposal()
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `story_id=eq.${storyId}`
      }, () => {
        if (mountedRef.current) {
          callbacksRef.current.onVote()
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && mountedRef.current) {
          console.log(`📡 Channel ${channelName} subscribed`)
        }
      })

    channelRef.current = channel

    return cleanup
  }, [storyId])
}