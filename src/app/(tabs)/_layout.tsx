import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
return (
<Tabs
screenOptions={{
headerShown: false,
tabBarActiveTintColor: '#2563EB',
tabBarInactiveTintColor: '#9CA3AF',

    tabBarStyle: {
      height: 68,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
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
          color={color}
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
          color={color}
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
          color={color}
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
          color={color}
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
backgroundColor: '#2563EB',
justifyContent: 'center',
alignItems: 'center',
},
});
