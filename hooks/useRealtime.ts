import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeStory(
  storyId: string,
  onParagraph: () => void,
  onProposal: () => void,
  onVote: () => void
) {
  useEffect(() => {
    if (!storyId) return

    const channel = supabase
      .channel(`story-${storyId}`)
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

    return () => { supabase.removeChannel(channel) }
  }, [storyId])
}