import { supabase } from './supabase'

// Types de notifications
export type NotificationType = 
  | 'new_vote'
  | 'new_proposal'
  | 'story_started'
  | 'turn_started'
  | 'story_completed'

interface NotificationData {
  type: NotificationType
  title: string
  body: string
  storyId?: string
  turnNumber?: number
  proposalId?: string
}

// Fonction pour envoyer une notification à un utilisateur spécifique
export async function sendNotificationToUser(
  userId: string,
  notification: NotificationData
) {
  try {
    // Récupérer le token de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single()

    if (!profile?.push_token) {
      console.log('⚠️ Aucun token pour l\'utilisateur', userId)
      return
    }

    // Envoyer la notification via Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.push_token,
        title: notification.title,
        body: notification.body,
        data: {
          type: notification.type,
          storyId: notification.storyId,
          turnNumber: notification.turnNumber,
          proposalId: notification.proposalId,
        },
        sound: 'default',
      }),
    })

    const result = await response.json()
    console.log('✅ Notification envoyée:', result)
    return result

  } catch (error) {
    console.error('❌ Erreur envoi notification:', error)
  }
}

// Fonction pour envoyer une notification à tous les membres d'une histoire
export async function notifyStoryMembers(
  storyId: string,
  notification: NotificationData,
  excludeUserId?: string
) {
  try {
    // Récupérer tous les membres de l'histoire
    const { data: members } = await supabase
      .from('story_members')
      .select('user_id')
      .eq('story_id', storyId)
      .neq('user_id', excludeUserId || '')

    if (!members || members.length === 0) {
      console.log('⚠️ Aucun membre à notifier')
      return
    }

    // Envoyer à chaque membre
    const promises = members.map(member => 
      sendNotificationToUser(member.user_id, {
        ...notification,
        storyId: storyId,
      })
    )

    await Promise.all(promises)
    console.log(`✅ Notifications envoyées à ${members.length} membres`)

  } catch (error) {
    console.error('❌ Erreur notification membres:', error)
  }
}