import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react-native';
import axios from 'axios';
import { useAuth } from '../../src/contexts/AuthContext';
import { Markdown } from './Markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  context?: {
    type: 'brief' | 'opportunity' | 'spec' | 'insight';
    id: string;
    title?: string;
  };
}

export function ChatWidget({ context }: ChatWidgetProps) {
  const { API } = useAuth();
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the floating button
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Add initial context message
  useEffect(() => {
    if (visible && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: context 
          ? `I'm here to help with your ${context.type}${context.title ? `: "${context.title}"` : ''}. Ask me anything about refining the content, generating ideas, or improving the spec.`
          : `Hi! I'm your AI assistant for product discovery. I can help you:

- **Analyze insights** and find patterns
- **Generate briefs** from opportunities
- **Refine specs** and user stories
- **Answer questions** about your product

What would you like help with?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [visible, context]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const payload: any = {
        message: userMessage.content,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      };

      if (context) {
        payload.context = context;
      }

      const res = await axios.post(`${API}/chat`, payload);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.response || res.data.message || 'I apologize, but I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      console.error('Chat error:', e);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
        paddingHorizontal: 12,
      }}>
        {!isUser && (
          <View style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#EFF6FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}>
            <Bot size={16} color="#002FA7" />
          </View>
        )}
        <View style={{
          maxWidth: '80%',
          backgroundColor: isUser ? '#171717' : '#F4F4F5',
          borderRadius: 12,
          borderTopRightRadius: isUser ? 4 : 12,
          borderTopLeftRadius: isUser ? 12 : 4,
          padding: 12,
        }}>
          {isUser ? (
            <Text style={{ color: 'white', fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
          ) : (
            <Markdown content={item.content} />
          )}
          <Text style={{ 
            fontSize: 10, 
            color: isUser ? '#A1A1AA' : '#71717A', 
            marginTop: 6,
            textAlign: isUser ? 'right' : 'left'
          }}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isUser && (
          <View style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#171717',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
          }}>
            <User size={16} color="white" />
          </View>
        )}
      </View>
    );
  };

  const quickActions = [
    { label: 'Summarize insights', action: 'Summarize the key insights from my data' },
    { label: 'Find patterns', action: 'What patterns do you see in the feedback?' },
    { label: 'Suggest features', action: 'Suggest features based on user feedback' },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <Animated.View style={{
        position: 'absolute',
        bottom: 90,
        right: 20,
        transform: [{ scale: pulseAnim }],
      }}>
        <TouchableOpacity
          onPress={() => setVisible(true)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#002FA7',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Sparkles size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end'
          }}>
            <View style={{ 
              height: Dimensions.get('window').height * 0.85,
              backgroundColor: 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#E4E4E7',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}>
                    <Sparkles size={20} color="#002FA7" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#171717' }}>AI Assistant</Text>
                    <Text style={{ fontSize: 11, color: '#71717A', fontFamily: 'monospace' }}>
                      {context ? `Context: ${context.type}` : 'General help'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setVisible(false)} style={{ padding: 4 }}>
                  <X size={24} color="#71717A" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={{ paddingVertical: 16 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                ListFooterComponent={loading ? (
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 12 }}>
                    <View style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#EFF6FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}>
                      <Bot size={16} color="#002FA7" />
                    </View>
                    <View style={{
                      backgroundColor: '#F4F4F5',
                      borderRadius: 12,
                      borderTopLeftRadius: 4,
                      padding: 12,
                    }}>
                      <ActivityIndicator size="small" color="#002FA7" />
                    </View>
                  </View>
                ) : null}
              />

              {/* Quick Actions (only show when few messages) */}
              {messages.length <= 1 && (
                <View style={{ 
                  flexDirection: 'row', 
                  paddingHorizontal: 12, 
                  paddingBottom: 8,
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  {quickActions.map((qa, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        setInput(qa.action);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: '#EFF6FF',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#002FA7' }}>{qa.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Input Area */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: '#E4E4E7',
                backgroundColor: '#FAFAFA',
              }}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask me anything..."
                  placeholderTextColor="#A1A1AA"
                  multiline
                  style={{
                    flex: 1,
                    maxHeight: 100,
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#E4E4E7',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#171717',
                  }}
                  onSubmitEditing={sendMessage}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: loading || !input.trim() ? '#A1A1AA' : '#002FA7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8,
                  }}
                >
                  <Send size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export default ChatWidget;
