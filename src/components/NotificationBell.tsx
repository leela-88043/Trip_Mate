import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type TripMateNotification,
} from '@/services/notifications';

export default function NotificationBell({
  userId,
}: {
  userId: string;
}) {
  const [visible, setVisible] = useState(false);
  const [items, setItems] =
    useState<TripMateNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generation = useRef(0);
  const mutationLock = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId || mutationLock.current) return;

    const version = ++generation.current;
    setLoading(true);

    try {
      const data = await loadNotifications(userId);

      if (version !== generation.current) return;

      setItems(data.notifications);
      setUnread(data.unreadCount);
      setReady(true);
      setError('');
    } catch (err) {
      if (version === generation.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load notifications.'
        );
      }
    } finally {
      if (version === generation.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();

      const timer = setInterval(() => {
        if (AppState.currentState === 'active') {
          void refresh();
        }
      }, 30000);

      const subscription = AppState.addEventListener(
        'change',
        (state) => {
          if (state === 'active') {
            void refresh();
          }
        }
      );

      return () => {
        clearInterval(timer);
        subscription.remove();
        generation.current += 1;
      };
    }, [refresh])
  );

  async function openNotification(
    item: TripMateNotification
  ) {
    if (mutationLock.current) return;

    mutationLock.current = true;
    generation.current += 1;

    setLoading(false);
    setBusy(true);
    setError('');

    try {
      if (!item.is_read) {
        await markNotificationRead(userId, item.id);

        setItems((current) =>
          current.map((row) =>
            row.id === item.id
              ? { ...row, is_read: true }
              : row
          )
        );

        setUnread((current) => Math.max(0, current - 1));
      }

      if (item.type.startsWith('companion_')) {
        setVisible(false);
        router.push('/companions');
      } else if (item.trip_id) {
        setVisible(false);

        router.push({
          pathname: '/trip-details',
          params: {
            tripId: item.trip_id,
          },
        });
      } else {
        setError(
          'This trip has been deleted. The notification has been marked as read.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to open notification.'
      );
    } finally {
      setBusy(false);
      mutationLock.current = false;
    }
  }

  async function markAllRead() {
    if (mutationLock.current) return;

    mutationLock.current = true;
    generation.current += 1;

    setLoading(false);
    setBusy(true);
    setError('');

    try {
      await markAllNotificationsRead(userId);

      setItems((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      );

      setUnread(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to mark notifications read.'
      );
    } finally {
      mutationLock.current = false;
      setBusy(false);
      void refresh();
    }
  }

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          error
            ? 'Notifications. Refresh needed.'
            : `Notifications. ${
                ready ? unread : 'Loading'
              } unread.`
        }
        style={styles.bell}
        disabled={!userId}
        onPress={() => {
          setVisible(true);
          void refresh();
        }}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color="#F7F8FC"
        />

        {(unread > 0 || !!error) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {error
                ? '!'
                : unread > 99
                  ? '99+'
                  : unread}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) {
            setVisible(false);
          }
        }}
      >
        <View style={styles.backdrop}>
          <View
            style={styles.panel}
            accessibilityViewIsModal
          >
            <View style={styles.header}>
              <Text style={styles.title}>
                Notifications
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.link}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.toolbar}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy || loading}
                onPress={() => void refresh()}
              >
                <Text style={styles.link}>
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={
                  busy || loading || unread === 0
                }
                onPress={() => void markAllRead()}
              >
                <Text
                  style={[
                    styles.link,
                    unread === 0 && styles.dim,
                  ]}
                >
                  Mark all read
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.note}>
              Latest 50 notifications. Tap a companion
              notification to open Companions, then Requests.
            </Text>

            {!!error && (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.error}
              >
                {error}
              </Text>
            )}

            {busy && (
              <ActivityIndicator
                color="#4F8CFF"
                style={styles.spinner}
              />
            )}

            {loading && !ready ? (
              <ActivityIndicator
                size="large"
                color="#4F8CFF"
                style={styles.spinner}
              />
            ) : (
              <FlatList
                style={styles.list}
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={busy}
                    style={[
                      styles.item,
                      !item.is_read && styles.unread,
                    ]}
                    onPress={() =>
                      void openNotification(item)
                    }
                  >
                    <Text style={styles.itemTitle}>
                      {!item.is_read ? '● ' : ''}
                      {item.title}
                    </Text>

                    <Text style={styles.body}>
                      {item.body}
                    </Text>

                    <Text style={styles.date}>
                      {new Date(
                        item.created_at
                      ).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {error
                      ? 'Refresh to try again.'
                      : 'No notifications yet. New trip and companion activity will appear here.'}
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#252A37',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#4F8CFF',
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 600,
    height: '80%',
    backgroundColor: '#151821',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#252A37',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#252A37',
  },
  title: {
    color: '#F7F8FC',
    fontSize: 22,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  link: {
    color: '#75A2FF',
    fontWeight: '700',
    paddingVertical: 12,
  },
  note: {
    color: '#9299A8',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  error: {
    color: '#FF9B9B',
    paddingHorizontal: 20,
    marginVertical: 8,
    lineHeight: 20,
  },
  spinner: {
    marginVertical: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  item: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#252A37',
    borderRadius: 14,
    marginBottom: 10,
  },
  unread: {
    backgroundColor: '#1C2B44',
    borderColor: '#354E75',
  },
  itemTitle: {
    color: '#F7F8FC',
    fontWeight: '700',
    fontSize: 15,
  },
  body: {
    color: '#B7BFCE',
    lineHeight: 21,
    marginTop: 7,
  },
  date: {
    color: '#9299A8',
    fontSize: 11,
    marginTop: 10,
  },
  empty: {
    color: '#9299A8',
    textAlign: 'center',
    lineHeight: 22,
    padding: 24,
  },
  dim: {
    opacity: 0.45,
  },
});