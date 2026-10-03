import { Text, TouchableOpacity, StyleSheet } from 'react-native';

type ProfileButtonProps = {
  fullName: string;
  onPress: () => void;
};

export default function ProfileButton({
  fullName,
  onPress,
}: ProfileButtonProps) {
  const firstLetter = fullName
    ? fullName.charAt(0).toUpperCase()
    : 'T';

  return (
    <TouchableOpacity
      style={styles.profileCircle}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.profileText}>
        {firstLetter}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});