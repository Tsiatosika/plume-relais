import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'

interface Badge {
  id: string
  name: string
  icon: string
  description: string
  category: string
  requirement_type: string
  requirement_value: number
  color: string
  is_secret: boolean
}

interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

interface BadgeSystemProps {
  badges: Badge[]
  userBadges: UserBadge[]
  compact?: boolean
  onBadgePress?: (badge: Badge) => void
  maxDisplay?: number
}

export default function BadgeSystem({ 
  badges, 
  userBadges, 
  compact = false,
  onBadgePress,
  maxDisplay = 5
}: BadgeSystemProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  // Si pas de badges, ne rien afficher
  if (!badges || badges.length === 0) {
    return null
  }

  const earnedBadgeIds = userBadges.map(ub => ub.badge_id)
  const earnedBadges = badges.filter(b => earnedBadgeIds.includes(b.id))

  // Version compacte (Feed, commentaires)
  if (compact) {
    // Si aucun badge gagné, ne rien afficher
    if (earnedBadges.length === 0) {
      return null
    }

    return (
      <View style={styles.compactContainer}>
        {earnedBadges.slice(0, maxDisplay).map(badge => (
          <TouchableOpacity
            key={badge.id}
            style={styles.compactBadge}
            onPress={() => {
              setSelectedBadge(badge)
              setModalVisible(true)
              if (onBadgePress) onBadgePress(badge)
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.compactIcon}>{badge.icon}</Text>
          </TouchableOpacity>
        ))}
        {earnedBadges.length > maxDisplay && (
          <View style={styles.compactMore}>
            <Text style={styles.compactMoreText}>+{earnedBadges.length - maxDisplay}</Text>
          </View>
        )}
      </View>
    )
  }

  // Version complète (Profil)
  const lockedBadges = badges.filter(b => !earnedBadgeIds.includes(b.id))

  return (
    <View style={styles.container}>
      {/* Badges débloqués */}
      {earnedBadges.length > 0 && (
        <View style={styles.grid}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>🏅 Badges débloqués</Text>
            <Text style={styles.sectionCount}>{earnedBadges.length}/{badges.length}</Text>
          </View>
          <View style={styles.badgesRow}>
            {earnedBadges.map(badge => (
              <TouchableOpacity
                key={badge.id}
                style={[styles.badgeCard, styles.badgeCardEarned]}
                onPress={() => {
                  setSelectedBadge(badge)
                  setModalVisible(true)
                  if (onBadgePress) onBadgePress(badge)
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Badges verrouillés - seulement dans le profil */}
      {lockedBadges.length > 0 && !compact && (
        <View style={styles.grid}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>🔒 À débloquer</Text>
            <Text style={styles.sectionCount}>{lockedBadges.length}</Text>
          </View>
          <View style={styles.badgesRow}>
            {lockedBadges.slice(0, 8).map(badge => (
              <TouchableOpacity
                key={badge.id}
                style={[styles.badgeCard, styles.badgeCardLocked]}
                onPress={() => {
                  setSelectedBadge({ ...badge, isLocked: true } as any)
                  setModalVisible(true)
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.badgeIcon}>❓</Text>
                <Text style={[styles.badgeName, styles.badgeNameLocked]} numberOfLines={1}>
                  {badge.name}
                </Text>
              </TouchableOpacity>
            ))}
            {lockedBadges.length > 8 && (
              <View style={[styles.badgeCard, styles.badgeCardLocked]}>
                <Text style={styles.moreBadgesText}>+{lockedBadges.length - 8}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Modal des détails */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedBadge && (
              <>
                <View style={styles.modalBadgeIcon}>
                  <Text style={styles.modalBadgeEmoji}>
                    {(selectedBadge as any).isLocked ? '❓' : selectedBadge.icon || '🏅'}
                  </Text>
                </View>
                <Text style={styles.modalBadgeName}>{selectedBadge.name}</Text>
                <Text style={styles.modalBadgeDesc}>{selectedBadge.description}</Text>
                
                {(selectedBadge as any).isLocked ? (
                  <View style={styles.modalLockedContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#9B8EC4" />
                    <Text style={styles.modalLockedText}>Non débloqué</Text>
                    <Text style={styles.modalLockedCondition}>
                      Condition: {selectedBadge.requirement_value} {selectedBadge.requirement_type === 'reputation' ? 'pts de réputation' : selectedBadge.requirement_type.replace('_', ' ')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.modalEarnedContainer}>
                    <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    <Text style={styles.modalEarnedText}>
                      Débloqué !
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCloseBtnText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1033',
  },
  sectionCount: {
    fontSize: 12,
    color: '#9B8EC4',
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: 64,
    height: 76,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderWidth: 1.5,
    backgroundColor: '#F7F5FF',
  },
  badgeCardEarned: {
    backgroundColor: '#F5F3FF',
    borderColor: '#5B4FCF',
  },
  badgeCardLocked: {
    backgroundColor: '#F7F5FF',
    borderColor: '#E8E4F8',
    opacity: 0.6,
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1A1033',
    textAlign: 'center',
    maxWidth: 56,
  },
  badgeNameLocked: {
    color: '#9B8EC4',
  },
  moreBadgesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B8EC4',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  compactBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#5B4FCF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIcon: {
    fontSize: 14,
  },
  compactMore: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F0ECF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMoreText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9B8EC4',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalBadgeIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalBadgeEmoji: {
    fontSize: 36,
  },
  modalBadgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1033',
    marginBottom: 4,
  },
  modalBadgeDesc: {
    fontSize: 14,
    color: '#9B8EC4',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalEarnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalEarnedText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
  },
  modalLockedContainer: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  modalLockedText: {
    fontSize: 14,
    color: '#9B8EC4',
    fontWeight: '600',
  },
  modalLockedCondition: {
    fontSize: 12,
    color: '#B8AED8',
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#5B4FCF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
})