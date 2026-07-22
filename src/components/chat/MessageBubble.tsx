import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/layout';
import type { MessageOut } from '../../types/api.types';

interface MessageBubbleProps {
  message: MessageOut;
  isLastUser?: boolean;
  isEditing?: boolean;
  editContent?: string;
  setEditContent?: (text: string) => void;
  onStartEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  disabled?: boolean;
}

export function MessageBubble({
  message,
  isLastUser = false,
  isEditing = false,
  editContent = '',
  setEditContent,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  disabled = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>H</Text>
        </View>
      )}

      {/* Edit pencil icon on left of user bubble if it's the last user message */}
      {isUser && isLastUser && !isEditing && !disabled && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onStartEdit}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pencil-outline" size={16} color={Colors.text.secondary} />
        </TouchableOpacity>
      )}

      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant, isEditing && styles.bubbleEditing]}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancelEdit}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !editContent.trim() && styles.saveBtnDisabled]}
                onPress={onSaveEdit}
                disabled={!editContent.trim()}
              >
                <Text style={styles.saveBtnText}>Save & Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
              {message.content}
            </Text>
            {message.created_at ? (
              <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAssistant]}>
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

export function TypingIndicator() {
  return (
    <View style={[styles.wrapper, styles.wrapperAssistant]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>H</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-end',
  },
  wrapperUser: {
    justifyContent: 'flex-end',
  },
  wrapperAssistant: {
    justifyContent: 'flex-start',
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.teal[600],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  editBtn: {
    padding: Spacing.xs,
    alignSelf: 'center',
  },

  bubble: {
    maxWidth: '78%',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleEditing: {
    maxWidth: '90%',
    width: '85%',
  },
  bubbleUser: {
    backgroundColor: Colors.teal[600],
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.bg.tertiary,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },

  text: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  textUser: {
    color: Colors.white,
  },
  textAssistant: {
    color: Colors.text.primary,
  },

  time: {
    fontSize: FontSize.xs,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeAssistant: {
    color: Colors.text.tertiary,
  },

  editContainer: {
    gap: Spacing.sm,
    width: '100%',
  },
  editInput: {
    backgroundColor: Colors.bg.secondary,
    color: Colors.text.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minHeight: 60,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.bg.border,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Colors.text.secondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  saveBtn: {
    backgroundColor: Colors.teal[600],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  saveBtnDisabled: {
    backgroundColor: Colors.bg.border,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  typingBubble: {
    paddingVertical: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.teal[400],
    opacity: 0.7,
  },
});

