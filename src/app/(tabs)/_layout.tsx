import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
return (
<Tabs
screenOptions={{
headerShown: false,
tabBarActiveTintColor: '#4F8CFF',
tabBarInactiveTintColor: '#858D9D',

    tabBarStyle: {
      height: 68,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: '#151821',
      borderTopWidth: 1,
      borderTopColor: '#252A37',
    },

    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600',
    },
  }}
>
  <Tabs.Screen
    name="index"
    options={{
      title: 'Home',
      tabBarIcon: ({ color, size, focused }) => (
        <Ionicons
          name={focused ? 'home' : 'home-outline'}
          size={size}
          color={typeof color === 'string' ? color : focused ? '#4F8CFF' : '#858D9D'}
        />
      ),
    }}
  />

  <Tabs.Screen
    name="explore"
    options={{
      title: 'Explore',
      tabBarIcon: ({ color, size, focused }) => (
        <Ionicons
          name={focused ? 'compass' : 'compass-outline'}
          size={size}
          color={typeof color === 'string' ? color : focused ? '#4F8CFF' : '#858D9D'}
        />
      ),
    }}
  />

  <Tabs.Screen
    name="create-trip"
    options={{
      title: 'Create',
      tabBarIcon: () => (
        <View style={styles.createButton}>
          <Ionicons
            name="add"
            size={30}
            color="#FFFFFF"
          />
        </View>
      ),
    }}
  />

  <Tabs.Screen
    name="my-trips"
    options={{
      title: 'My Trips',
      tabBarIcon: ({ color, size, focused }) => (
        <Ionicons
          name={focused ? 'briefcase' : 'briefcase-outline'}
          size={size}
          color={typeof color === 'string' ? color : focused ? '#4F8CFF' : '#858D9D'}
        />
      ),
    }}
  />

  <Tabs.Screen
    name="safety"
    options={{
      title: 'Safety',
      tabBarIcon: ({ color, size, focused }) => (
        <Ionicons
          name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
          size={size}
          color={typeof color === 'string' ? color : focused ? '#4F8CFF' : '#858D9D'}
        />
      ),
    }}
  />
</Tabs>

);
}

const styles = StyleSheet.create({
createButton: {
width: 43,
height: 43,
borderRadius: 22,
backgroundColor: '#4F8CFF',
justifyContent: 'center',
alignItems: 'center',
},
});
