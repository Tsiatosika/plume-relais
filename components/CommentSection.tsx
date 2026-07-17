import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, Alert, ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useReputation } from '../hooks/useReputation'
import BadgeSystem from './BadgeSystem'

interface Comment {
  id: string
  content: string
  user_id: string
  created_at: string
  pseudo?: string
}

interface CommentSectionProps {
  storyId: string
}

export default function CommentSection({ storyId }: CommentSectionProps) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const loadComments = async () => {
    console.log('📥 Chargement des commentaires pour:', storyId)
    
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('id, content, user_id, created_at')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false })

      if (commentsError) {
        console.error('❌ Erreur chargement commentaires:', commentsError)
        Alert.alert('Erreur', 'Impossible de charger les commentaires')
        return
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([])
        setLoading(false)
        return
      }

      const userIds = commentsData.map(c => c.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, pseudo')
        .in('id', userIds)

      if (profilesError) {
        console.error('❌ Erreur chargement profils:', profilesError)
      }

      const profilesMap: Record<string, string> = {}
      if (profilesData) {
        profilesData.forEach(p => {
          profilesMap[p.id] = p.pseudo || 'Anonyme'
        })
      }

      const commentsWithPseudo = commentsData.map(comment => ({
        ...comment,
        pseudo: profilesMap[comment.user_id] || 'Anonyme'
      }))

      console.log('✅ Commentaires chargés:', commentsWithPseudo.length)
      setComments(commentsWithPseudo)
    } catch (error) {
      console.error('❌ Erreur:', error)
      Alert.alert('Erreur', 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (storyId) {
      loadComments()
    }

    const channel = supabase
      .channel(`comments-${storyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `story_id=eq.${storyId}`
      }, (payload) => {
        console.log('📨 Nouveau commentaire en temps réel:', payload)
        loadComments()
      })
      .subscribe((status) => {
        console.log('📡 Channel commentaires:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storyId])

  const handleSendComment = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Connecte-toi pour commenter')
      return
    }

    if (!newComment.trim()) {
      Alert.alert('Erreur', 'Écris un commentaire')
      return
    }

    setSending(true)
    console.log('📤 Envoi du commentaire...')

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          story_id: storyId,
          user_id: user.id,
          content: newComment.trim(),
        })

      if (error) {
        console.error('❌ Erreur insertion:', error)
        Alert.alert('Erreur', error.message)
        setSending(false)
        return
      }

      console.log('✅ Commentaire envoyé')
      setNewComment('')
      await loadComments()
      Alert.alert('Succès', 'Commentaire ajouté !')

    } catch (error) {
      console.error('❌ Erreur:', error)
      Alert.alert('Erreur', 'Une erreur est survenue')
    }

    setSending(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous supprimer ce commentaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('comments')
              .delete()
              .eq('id', commentId)

            if (error) {
              Alert.alert('Erreur', error.message)
            } else {
              await loadComments()
            }
          }
        }
      ]
    )
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}j`
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Composant CommentItem avec badges
  const CommentItem = ({ comment, isOwn }: { comment: Comment, isOwn: boolean }) => {
    const { badges, userBadges, loading: badgeLoading } = useReputation(comment.user_id)
    
    return (
      <View style={[styles.commentCard, isOwn && styles.commentCardOwn]}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAuthorContainer}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarText}>
                {comment.pseudo?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.commentAuthor}>
              {comment.pseudo || 'Anonyme'}
            </Text>
          </View>
          <View style={styles.commentRight}>
            <Text style={styles.commentDate}>
              {formatDate(comment.created_at)}
            </Text>
            {isOwn && (
              <TouchableOpacity
                onPress={() => handleDeleteComment(comment.id)}
                style={styles.deleteBtn}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.commentContent}>{comment.content}</Text>
        {!badgeLoading && badges.length > 0 && (
          <View style={styles.commentBadges}>
            <BadgeSystem 
              badges={badges} 
              userBadges={userBadges}
              compact={true}
            />
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#5B4FCF" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="chatbubble-outline" size={18} color="#5B4FCF" />
        <Text style={styles.title}>
          Commentaires ({comments.length})
        </Text>
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        inverted
        scrollEnabled={false}
        renderItem={({ item }) => (
          <CommentItem 
            comment={item} 
            isOwn={item.user_id === user?.id}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#C4B8E8" />
            <Text style={styles.emptyText}>Sois le premier à commenter !</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor="#B8AED8"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!newComment.trim() || sending) && styles.sendBtnDisabled
            ]}
            onPress={handleSendComment}
            disabled={!newComment.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1033',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#9B8EC4',
    marginTop: 8,
  },
  commentCard: {
    backgroundColor: '#F7F5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0ECF8',
  },
  commentCardOwn: {
    backgroundColor: '#F5F3FF',
    borderColor: '#E8E4F8',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E8E4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B4FCF',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1033',
  },
  commentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentDate: {
    fontSize: 11,
    color: '#9B8EC4',
  },
  deleteBtn: {
    padding: 2,
  },
  commentContent: {
    fontSize: 14,
    color: '#1A1033',
    lineHeight: 20,
    marginLeft: 36,
  },
  commentBadges: {
    marginTop: 6,
    marginLeft: 36,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0ECF8',
    paddingTop: 12,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E8E4F8',
    borderRadius: 12,
    padding: 10,
    paddingTop: 10,
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#FAFAFA',
    color: '#1A1033',
  },
  sendBtn: {
    backgroundColor: '#5B4FCF',
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B4FCF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#C4B8E8',
    shadowOpacity: 0,
    elevation: 0,
  },
})