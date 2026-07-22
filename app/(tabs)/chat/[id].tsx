import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../../src/store/chat.store';
import { MessageBubble, TypingIndicator } from '../../../src/components/chat/MessageBubble';
import { Colors } from '../../../src/constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../../src/constants/layout';
import type { MessageOut } from '../../../src/types/api.types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const {
    messages, activeConversation, isLoading, isSending, error,
    loadConversation, sendMessage, editLastMessage, stopSending,
    deleteConversation, submitFeedback, clearActive,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');

  useEffect(() => {
    if (id) loadConversation(id);
    return () => clearActive();
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isSending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    await sendMessage(text);
  }

  function handleStartEdit(msg: MessageOut) {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  }

  function handleCancelEdit() {
    setEditingMessageId(null);
    setEditContent('');
  }

  async function handleSaveEdit() {
    if (!editContent.trim() || isSending) return;
    const text = editContent;
    setEditingMessageId(null);
    setEditContent('');
    await editLastMessage(text);
  }

  function handleDeleteConversation() {
    if (!activeConversation) return;
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteConversation(activeConversation.id);
            router.back();
          },
        },
      ]
    );
  }

  async function handleFeedbackSubmit() {
    if (rating === 0) { Alert.alert('Rate the conversation', 'Please select a rating.'); return; }
    await submitFeedback(rating);
    setShowFeedback(false);
    Alert.alert('Thanks!', 'Your feedback helps Hetu improve.');
  }

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.teal[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.teal[400]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {activeConversation?.topic ?? 'Hetu'}
          </Text>
          {activeConversation?.urgency && activeConversation.urgency !== 'low' && (
            <Text style={styles.navUrgency}>
              Urgency: {activeConversation.urgency}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowFeedback(true)} style={styles.menuBtn}>
          <Ionicons name="star-outline" size={22} color={Colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteConversation} style={styles.menuBtn}>
          <Ionicons name="trash-outline" size={22} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => {
            const isLastUser = lastUserMsg?.id === item.id && item.role === 'user';
            const isEditing = editingMessageId === item.id;
            return (
              <MessageBubble
                message={item}
                isLastUser={isLastUser}
                isEditing={isEditing}
                editContent={editContent}
                setEditContent={setEditContent}
                onStartEdit={() => handleStartEdit(item)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                disabled={isSending}
              />
            );
          }}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Say hello to Hetu 👋</Text>
            </View>
          }
          ListFooterComponent={isSending ? <TypingIndicator /> : null}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Message Hetu…"
            placeholderTextColor={Colors.text.tertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            editable={!isSending}
            onSubmitEditing={handleSend}
          />
          {isSending ? (
            <TouchableOpacity style={styles.stopBtn} onPress={stopSending}>
              <Ionicons name="square" size={16} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || isSending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || isSending}
            >
              <Ionicons name="send" size={18} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Feedback modal */}
      <Modal visible={showFeedback} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate this conversation</Text>
            <Text style={styles.modalSubtitle}>How helpful was Hetu?</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Ionicons
                    name={s <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={s <= rating ? Colors.sattva.main : Colors.bg.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleFeedbackSubmit}>
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFeedback(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg.primary },

  navbar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.bg.border,
  },
  backBtn: { padding: Spacing.xs },
  navTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text.primary },
  navUrgency: { fontSize: FontSize.xs, color: Colors.urgency.high },
  menuBtn: { padding: Spacing.xs },

  messageList: { paddingVertical: Spacing.md, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyChatText: { color: Colors.text.tertiary, fontSize: FontSize.md },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.bg.border,
    backgroundColor: Colors.bg.secondary,
  },
  textInput: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: Colors.text.primary,
    fontSize: FontSize.md,
    borderWidth: 1, borderColor: Colors.bg.border,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.teal[600], alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.bg.tertiary },
  stopBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.urgency.high, alignItems: 'center', justifyContent: 'center',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.md,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text.primary },
  modalSubtitle: { fontSize: FontSize.md, color: Colors.text.secondary },
  stars: { flexDirection: 'row', gap: Spacing.sm },
  submitBtn: {
    width: '100%', backgroundColor: Colors.teal[600],
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center',
  },
  submitBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  cancelText: { color: Colors.text.tertiary, fontSize: FontSize.md },
});

