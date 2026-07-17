import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native'

export default function AppLayout() {
  const router = useRouter()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#5B4FCF',
        tabBarInactiveTintColor: '#9B8EC4',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#F0ECF8',
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
          shadowColor: '#1A1033',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 4,
        },
        headerStyle: {
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#F0ECF8',
        },
        headerTintColor: '#1A1033',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* 🏠 Onglet Accueil / Feed */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={size} 
              color={color} 
            />
          ),
          headerTitle: 'Plume Relais',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(app)/story/create')}
              style={{ marginRight: 16 }}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={24} color="#5B4FCF" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* 👤 Onglet Profil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />

      {/* 🚫 Écrans masqués de la barre de navigation */}
      <Tabs.Screen 
        name="story/[id]" 
        options={{ 
          href: null, 
          title: 'Histoire',
          headerShown: false,
        }} 
      />
      <Tabs.Screen 
        name="story/create" 
        options={{ 
          href: null, 
          title: 'Nouvelle histoire',
          headerShown: false,
        }} 
      />
      <Tabs.Screen 
        name="story/vote/[id]" 
        options={{ 
          href: null, 
          title: 'Voter',
          headerShown: false,
        }} 
      />
      <Tabs.Screen 
        name="contribute/[id]" 
        options={{ 
          href: null, 
          title: 'Proposer une suite',
          headerShown: false,
        }} 
      />
    </Tabs>
  )
}