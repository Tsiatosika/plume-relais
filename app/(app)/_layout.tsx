import { Tabs, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7F77DD',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          paddingBottom: 4,
        },
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#7F77DD',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Histoires',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="story/[id]" options={{ href: null, title: '' }} />
      <Tabs.Screen name="story/create" options={{ href: null, title: 'Nouvelle histoire' }} />
      <Tabs.Screen name="story/vote/[id]" options={{ href: null, title: 'Voter' }} />
      <Tabs.Screen name="contribute/[id]" options={{ href: null, title: 'Proposer une suite' }} />
    </Tabs>
  )
}