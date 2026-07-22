import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { useChatStore } from '../../src/store/chat.store';
import { Colors } from '../../src/constants/colors';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '../../src/constants/layout';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversations, loadConversations, startNewConversation } = useChatStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const recentConvs = conversations.slice(0, 3);
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  async function handleNewChat() {
    const id = await startNewConversation();
    router.push(`/(tabs)/chat/${id}`);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{firstName} ✦</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.full_name?.[0]?.toUpperCase() ?? 'H'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Start chat CTA */}
        <TouchableOpacity style={styles.chatCta} onPress={handleNewChat} activeOpacity={0.85}>
          <View style={styles.chatCtaLeft}>
            <View style={styles.chatCtaIcon}>
              <Ionicons name="chatbubbles" size={24} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.chatCtaTitle}>Start a conversation</Text>
              <Text style={styles.chatCtaSubtitle}>Talk to Hetu about anything</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward-circle" size={28} color={Colors.teal[300]} />
        </TouchableOpacity>

        {/* Recent chats */}
        {recentConvs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent chats</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/chat/index')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentConvs.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={styles.convRow}
                onPress={() => router.push(`/(tabs)/chat/${conv.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.convIcon}>
                  <Ionicons name="chatbubble-outline" size={18} color={Colors.teal[400]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.convTopic}>{conv.topic ?? 'Conversation'}</Text>
                  <Text style={styles.convDate}>
                    {new Date(conv.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty state */}
        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={Colors.bg.border} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start chatting with Hetu to get personalised support
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  greeting: { fontSize: FontSize.md, color: Colors.text.secondary },
  name: { fontSize: FontSize.xxl + 4, fontWeight: FontWeight.bold, color: Colors.text.primary },
  avatarBtn: {},
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.teal[600], alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.white },

  chatCta: {
    backgroundColor: Colors.teal[600],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    ...Shadow.teal,
  },
  chatCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  chatCtaIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  chatCtaTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.white },
  chatCtaSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  section: {},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text.primary },
  seeAll: { fontSize: FontSize.sm, color: Colors.teal[400] },

  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.bg.border,
  },
  convIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bg.tertiary, alignItems: 'center', justifyContent: 'center',
  },
  convTopic: { fontSize: FontSize.md, color: Colors.text.primary, fontWeight: FontWeight.medium },
  convDate: { fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },

  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary },
  emptySubtitle: {
    fontSize: FontSize.md, color: Colors.text.secondary,
    textAlign: 'center', lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
});
