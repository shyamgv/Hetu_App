import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../../src/store/chat.store';
import { Colors } from '../../../src/constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../../src/constants/layout';
import type { ConversationOut } from '../../../src/types/api.types';

export default function ChatListScreen() {
  const router = useRouter();
  const { conversations, isLoading, loadConversations, startNewConversation, deleteConversation } = useChatStore();

  useEffect(() => {
    loadConversations();
  }, []);

  async function handleNew() {
    const id = await startNewConversation();
    router.push(`/(tabs)/chat/${id}`);
  }

  function handleDelete(id: string) {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteConversation(id);
          },
        },
      ]
    );
  }

  function renderItem({ item }: { item: ConversationOut }) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.icon}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.teal[400]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topic} numberOfLines={1}>
            {item.topic ?? 'New conversation'}
          </Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        {item.urgency && item.urgency !== 'low' && (
          <View style={[styles.urgencyDot, { backgroundColor: getUrgencyColor(item.urgency) }]} />
        )}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.text.tertiary} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Conversations</Text>
        <TouchableOpacity style={styles.newBtn} onPress={handleNew}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.teal[500]} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.bg.border} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>Start a new conversation with Hetu</Text>
          <TouchableOpacity style={styles.startBtn} onPress={handleNew}>
            <Text style={styles.startBtnText}>Start chatting</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

function getUrgencyColor(u: string) {
  switch (u) {
    case 'critical': return Colors.urgency.critical;
    case 'high':     return Colors.urgency.high;
    case 'medium':   return Colors.urgency.medium;
    default:         return Colors.urgency.low;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.bg.border,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary },
  newBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.teal[600], alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingVertical: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  icon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.bg.tertiary, alignItems: 'center', justifyContent: 'center',
  },
  topic: { fontSize: FontSize.md, color: Colors.text.primary, fontWeight: FontWeight.medium },
  date: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.xs },
  deleteBtn: { padding: Spacing.xs, marginRight: Spacing.xs },
  sep: { height: 1, backgroundColor: Colors.bg.border, marginHorizontal: Spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.text.secondary, textAlign: 'center' },
  startBtn: {
    marginTop: Spacing.sm, backgroundColor: Colors.teal[600],
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  startBtnText: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
});

