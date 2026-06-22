export type Profile = {
  id: string
  pseudo: string
  avatar_url: string | null
  reputation: number
  push_token?: string | null
}

export type Story = {
  id: string
  title: string
  creator_id: string
  visibility: 'public' | 'private'
  blind_mode: boolean
  max_contributions: number
  turn_duration_minutes: number
  status: 'open' | 'voting' | 'done'
  cover_url: string | null
  created_at: string
  turn_started_at: string | null
}

export type Paragraph = {
  id: string
  story_id: string
  author_id: string
  content: string
  turn_number: number
  created_at: string
  author?: Profile
}

export type Proposal = {
  id: string
  story_id: string
  author_id: string
  content: string
  turn_number: number
  votes_count: number
  is_winner: boolean
  created_at: string
  author?: Profile
}

export type Vote = {
  id: string
  proposal_id: string
  voter_id: string
  story_id: string
  turn_number: number
}

export type StoryMember = {
  story_id: string
  user_id: string
  joined_at: string
}