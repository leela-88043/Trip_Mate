
import {
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

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

  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : PANEL_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Switch Account
  const handleSwitchAccount = () => {
    if (switchingAccount || loggingOut) return;

    Alert.alert(
      'Switch Account',
      'You will be signed out of your current account. You can then log in using another account. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: async () => {
            setSwitchingAccount(true);

            try {
              const { error } = await signOut();

              if (error) {
                throw error;
              }

              onClose();

              // Navigate to the existing login screen
              router.replace('/login');
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Unable to switch accounts. Please try again.';

              setSwitchingAccount(false);

              Alert.alert('Switch Account Failed', message);
            }
          },
        },
      ]
    );
  };

  // Normal Logout
  const handleLogout = () => {
    if (switchingAccount || loggingOut) return;

    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);

            try {
              const { error } = await signOut();

              if (error) {
                throw error;
              }

              onClose();
              router.replace('/login');
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'Unable to log out. Please try again.';

              setLoggingOut(false);

              Alert.alert('Logout Failed', message);
            }
          },
        },
      ]
    );
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
        disabled={switchingAccount || loggingOut}
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
            disabled={switchingAccount || loggingOut}
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
          disabled={switchingAccount || loggingOut}
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
          style={[
            styles.option,
            switchingAccount && styles.disabledOption,
          ]}
          disabled={switchingAccount || loggingOut}
          onPress={handleSwitchAccount}
        >
          <Text style={styles.optionIcon}>
            🔄
          </Text>

          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>
              Switch Account
            </Text>

            <Text style={styles.optionSubtitle}>
              {switchingAccount
                ? 'Switching account...'
                : 'Change to another account'}
            </Text>
          </View>

          {switchingAccount && (
            <ActivityIndicator color="#4F8CFF" />
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Login */}
        <TouchableOpacity
          style={styles.option}
          disabled={switchingAccount || loggingOut}
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
              Open the login screen
            </Text>
          </View>
        </TouchableOpacity>

        {/* Sign Up */}
        <TouchableOpacity
          style={styles.option}
          disabled={switchingAccount || loggingOut}
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
          style={[
            styles.logoutOption,
            loggingOut && styles.disabledOption,
          ]}
          disabled={switchingAccount || loggingOut}
          onPress={handleLogout}
        >
          <Text style={styles.optionIcon}>
            🚪
          </Text>

          <View style={styles.optionContent}>
            <Text style={styles.logoutTitle}>
              Logout
            </Text>

            <Text style={styles.optionSubtitle}>
              {loggingOut
                ? 'Logging out...'
                : 'Sign out of this account'}
            </Text>
          </View>

          {loggingOut && (
            <ActivityIndicator color="#FF7B86" />
          )}
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
    backgroundColor: '#151821',
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
    color: '#F7F8FC',
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1B202C',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeText: {
    fontSize: 18,
    color: '#D9DDE7',
  },

  userSection: {
    alignItems: 'center',
    paddingBottom: 24,
  },

  largeProfileCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#4F8CFF',
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
    color: '#F7F8FC',
  },

  email: {
    fontSize: 14,
    color: '#9299A8',
    marginTop: 5,
    textAlign: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#252A37',
    marginVertical: 12,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  optionContent: {
    flex: 1,
  },

  disabledOption: {
    opacity: 0.6,
  },

  optionIcon: {
    fontSize: 22,
    width: 42,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F7F8FC',
  },

  optionSubtitle: {
    fontSize: 12,
    color: '#9299A8',
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
    color: '#FF7B86',
  },
});
