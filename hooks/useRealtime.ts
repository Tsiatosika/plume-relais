import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeStory(
  storyId: string,
  onParagraph: () => void,
  onProposal: () => void,
  onVote: () => void
) {
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!storyId) return

    // Nettoie le channel précédent s'il existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`story-${storyId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'paragraphs',
        filter: `story_id=eq.${storyId}`
      }, onParagraph)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'proposals',
        filter: `story_id=eq.${storyId}`
      }, onProposal)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `story_id=eq.${storyId}`
      }, onVote)
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [storyId])
}