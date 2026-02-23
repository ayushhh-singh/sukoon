import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Square, Mic } from 'lucide-react-native';
import type { ChatMessage } from '../../types/chat';
import type { SpeakingState, TranscriptEntry } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radii, typography } from '../../theme';

interface Props {
  mode: 'voice' | 'chat';
  isConnected: boolean;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onEnd: () => void;
  speakingState: SpeakingState;
  currentAiText: string;
  transcripts: TranscriptEntry[];
  sessionDuration: number;
  onDurationUpdate: (s: number) => void;
}

export default function ActiveSessionScreen({
  mode, isConnected, chatMessages, onSendMessage, onEnd,
  speakingState, currentAiText, transcripts, sessionDuration, onDurationUpdate,
}: Props) {
  const { c } = useTheme();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orbScale = useRef(new Animated.Value(1)).current;

  const isAiStreaming = chatMessages.length > 0 && chatMessages[chatMessages.length - 1]?.isStreaming;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      onDurationUpdate(sessionDuration + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  });

  // Orb animation
  useEffect(() => {
    const toValue = speakingState === 'idle' ? 1 : 1.3;
    Animated.spring(orbScale, { toValue, useNativeDriver: true, friction: 4 }).start();
  }, [speakingState, orbScale]);

  const handleSend = () => {
    if (input.trim() && !isAiStreaming) {
      onSendMessage(input);
      setInput('');
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (mode === 'voice') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
        <View style={styles.voiceHeader}>
          <Text style={[styles.timer, { color: c.textMuted }]}>{formatTime(sessionDuration)}</Text>
          <TouchableOpacity style={[styles.endBtn, { backgroundColor: c.rose }]} onPress={onEnd}>
            <Square size={14} color="#FFFFFF" />
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.voiceCenter}>
          {/* Voice Orb */}
          <View style={styles.orbContainer}>
            <Animated.View style={[styles.orbGlow, {
              backgroundColor: speakingState === 'user-speaking' ? c.accentPrimary + '15' :
                speakingState === 'ai-speaking' ? c.teal + '15' : c.surface,
              transform: [{ scale: Animated.multiply(orbScale, 1.4) }],
            }]} />
            <Animated.View style={[styles.orb, {
              backgroundColor: speakingState === 'user-speaking' ? c.accentPrimary :
                speakingState === 'ai-speaking' ? c.teal : c.surface,
              transform: [{ scale: orbScale }],
            }]} />
          </View>
          <Text style={[styles.orbLabel, { color: c.textSecondary }]}>
            {speakingState === 'user-speaking' ? 'Listening...' :
             speakingState === 'ai-speaking' ? 'Dr. Aria is speaking...' : 'Ready'}
          </Text>
        </View>

        {/* Live transcript */}
        {(currentAiText || transcripts.length > 0) && (
          <View style={[styles.transcriptBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.transcriptText, { color: c.textSecondary }]} numberOfLines={3}>
              {currentAiText || (transcripts.length > 0 ? transcripts[transcripts.length - 1].text : '')}
            </Text>
          </View>
        )}

        <View style={styles.voiceControls}>
          <TouchableOpacity style={[styles.micBtn, { backgroundColor: c.accentPrimary }]}>
            <Mic size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Chat mode
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        {/* Chat header */}
        <View style={[styles.chatHeader, { backgroundColor: c.bgCard, borderBottomColor: c.border }]}>
          <View style={styles.chatHeaderInfo}>
            <View style={[styles.avatar, { backgroundColor: c.accentPrimary }]}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View>
              <Text style={[styles.chatName, { color: c.textPrimary }]}>Dr. Aria</Text>
              <Text style={[styles.chatStatus, { color: isConnected ? c.green : c.textMuted }]}>
                {isConnected ? 'Online' : 'Connecting...'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.endBtnSmall, { borderColor: c.rose }]} onPress={onEnd}>
            <Square size={12} color={c.rose} />
            <Text style={[styles.endBtnSmallText, { color: c.rose }]}>End</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[
              styles.bubble,
              item.role === 'user'
                ? [styles.userBubble, { backgroundColor: c.accentPrimary }]
                : [styles.aiBubble, { backgroundColor: c.bgCard, borderColor: c.border }],
            ]}>
              <Text style={[
                styles.bubbleText,
                { color: item.role === 'user' ? '#FFFFFF' : c.textPrimary },
              ]}>
                {item.text}
              </Text>
              {!item.isStreaming && (
                <Text style={[styles.bubbleTime, { color: item.role === 'user' ? '#FFFFFF90' : c.textMuted }]}>
                  {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={[styles.emptyChatText, { color: c.textMuted }]}>Dr. Aria is joining...</Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: c.bgCard, borderTopColor: c.border }]}>
          <TextInput
            style={[styles.chatInput, { backgroundColor: c.surface, color: c.textPrimary }]}
            value={input}
            onChangeText={setInput}
            placeholder={isAiStreaming ? 'Dr. Aria is typing...' : 'Type your message...'}
            placeholderTextColor={c.textMuted}
            editable={!isAiStreaming && isConnected}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: c.accentPrimary, opacity: (!input.trim() || isAiStreaming) ? 0.4 : 1 }]}
            onPress={handleSend}
            disabled={!input.trim() || isAiStreaming || !isConnected}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  // Voice mode
  voiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  timer: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full },
  endBtnText: { color: '#FFFFFF', fontWeight: typography.weights.semibold, fontSize: typography.sizes.sm },
  voiceCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  orbContainer: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  orbGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80 },
  orb: { width: 100, height: 100, borderRadius: 50 },
  orbLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  transcriptBox: { marginHorizontal: spacing.xl, padding: spacing.lg, borderRadius: radii.md, borderWidth: 1 },
  transcriptText: { fontSize: typography.sizes.sm, lineHeight: 20 },
  voiceControls: { alignItems: 'center', paddingBottom: spacing.xxxl },
  micBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  // Chat mode
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1 },
  chatHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: typography.weights.bold, fontSize: typography.sizes.lg },
  chatName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  chatStatus: { fontSize: typography.sizes.xs },
  endBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1 },
  endBtnSmallText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  messageList: { padding: spacing.lg, gap: spacing.sm },
  bubble: { maxWidth: '80%', padding: spacing.md, borderRadius: radii.lg },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: typography.sizes.sm, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxxl },
  emptyChatText: { fontSize: typography.sizes.sm },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderTopWidth: 1 },
  chatInput: { flex: 1, borderRadius: radii.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: typography.sizes.sm },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
