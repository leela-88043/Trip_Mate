import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { signOut } from '@/services/auth';

type ProfilePanelProps = {
  visible: boolean;
  fullName: string;
  email: string;
  onClose: () => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 380);

export default function ProfilePanel({
  visible,
  fullName,
  email,
  onClose,
}: ProfilePanelProps) {
  const slideAnim = useRef(
    new Animated.Value(PANEL_WIDTH)
  ).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : PANEL_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const handleLogout = async () => {
    const { error } = await signOut();

    if (error) {
      Alert.alert('Logout Failed', error.message);
      return;
    }

    onClose();
    router.replace('/login');
  };

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={styles.overlay}
    >
      {/* Dark Background */}
      <TouchableOpacity
        style={[
          styles.background,
          {
            opacity: visible ? 1 : 0,
          },
        ]}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sliding Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [
              {
                translateX: slideAnim,
              },
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>
            Account
          </Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeText}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        {/* User Information */}
        <View style={styles.userSection}>
          <View style={styles.largeProfileCircle}>
            <Text style={styles.largeProfileText}>
              {fullName.charAt(0).toUpperCase() || 'T'}
            </Text>
          </View>

          <Text style={styles.name}>
            {fullName}
          </Text>

          <Text style={styles.email}>
            {email}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* My Profile */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => {
  onClose();
  router.push('/my-profile');
}}
        >
          <Text style={styles.optionIcon}>
            👤
          </Text>

          <View>
            <Text style={styles.optionTitle}>
              My Profile
            </Text>

            <Text style={styles.optionSubtitle}>
              View and edit your profile
            </Text>
          </View>
        </TouchableOpacity>

        {/* Switch Account */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            Alert.alert(
              'Switch Account',
              'Account switching will be added soon.'
            );
          }}
        >
          <Text style={styles.optionIcon}>
            🔄
          </Text>

          <View>
            <Text style={styles.optionTitle}>
              Switch Account
            </Text>

            <Text style={styles.optionSubtitle}>
              Change to another account
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Login */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            onClose();
            router.push('/login');
          }}
        >
          <Text style={styles.optionIcon}>
            🔐
          </Text>

          <View>
            <Text style={styles.optionTitle}>
              Login
            </Text>

            <Text style={styles.optionSubtitle}>
              Login with another account
            </Text>
          </View>
        </TouchableOpacity>

        {/* Sign Up */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            onClose();
            router.push('/signup');
          }}
        >
          <Text style={styles.optionIcon}>
            📝
          </Text>

          <View>
            <Text style={styles.optionTitle}>
              Sign Up
            </Text>

            <Text style={styles.optionSubtitle}>
              Create a new account
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutOption}
          onPress={handleLogout}
        >
          <Text style={styles.optionIcon}>
            🚪
          </Text>

          <View>
            <Text style={styles.logoutTitle}>
              Logout
            </Text>

            <Text style={styles.optionSubtitle}>
              Sign out of this account
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 100,
  },

  background: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  panel: {
    width: PANEL_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 22,
    paddingBottom: 30,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: -3,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },

  panelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeText: {
    fontSize: 18,
    color: '#374151',
  },

  userSection: {
    alignItems: 'center',
    paddingBottom: 24,
  },

  largeProfileCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  largeProfileText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },

  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
    textAlign: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  optionIcon: {
    fontSize: 22,
    width: 42,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  optionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },

  logoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  logoutTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});

