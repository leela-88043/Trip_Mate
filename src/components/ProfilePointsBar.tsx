import { StyleSheet, Text, View } from 'react-native';

type ProfilePointsBarProps = {
  points: number | null;
  loading?: boolean;
};

export default function ProfilePointsBar({
  points,
  loading = false,
}: ProfilePointsBarProps) {
  const available =
    !loading &&
    typeof points === 'number' &&
    Number.isFinite(points);

  const score = available
    ? Math.min(1000, Math.max(0, Math.round(points)))
    : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Points</Text>

      <View style={styles.row}>
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Profile points"
          accessibilityValue={
            available
              ? { min: 0, max: 1000, now: score }
              : {
                  text: loading
                    ? 'Loading points'
                    : 'Points unavailable',
                }
          }
        >
          <View
            style={[
              styles.fill,
              { width: `${score / 10}%` },
            ]}
          />
        </View>

        <Text style={styles.points}>
          {loading
            ? 'Loading…'
            : available
              ? `${score} / 1000`
              : 'Unavailable'}
        </Text>
      </View>

      <Text style={styles.description}>
        Based on profile details and confirmed trip participation.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#252A37',
    borderRadius: 14,
  },

  title: {
    color: '#F7F8FC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  track: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#252A37',
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#4F8CFF',
  },

  points: {
    color: '#A9C5FF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 12,
  },

  description: {
    color: '#9299A8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
});