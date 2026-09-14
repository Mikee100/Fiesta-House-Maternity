import { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/state/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, MessageSquare, Settings, AlertCircle, CheckCircle, Send, Loader2 } from 'lucide-react';
import { Instagram as InstagramIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config';

import { io, Socket } from 'socket.io-client';

import {
  getInstagramSettings,
  updateInstagramSettings,
  testInstagramConnection,
  sendInstagramMessage,
  getInstagramMessages,
  getInstagramConversations,
  InstagramSettings,
  InstagramMessage,
  InstagramConversation
} from '@/api/instagram';
import { useToast } from '@/hooks/use-toast';

export default function Instagram() {
  // Always minimize sidebar when on this page
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  useEffect(() => {
    setSidebarCollapsed(true);
    // Optionally, restore on unmount:
    // return () => setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  const [settings, setSettings] = useState<InstagramSettings>({
    businessAccountId: '',
    accessToken: '',
    verifyToken: '',
    webhookUrl: '',
  });

  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [conversations, setConversations] = useState<InstagramConversation[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socketRef.current = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket');
      // Join the instagram room to receive events
      socketRef.current.emit('join', { platform: 'instagram' });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    // Listen for new messages
    socketRef.current.on('newMessage', (data: any) => {
      if (data.platform === 'instagram') {
        if (data.customerId === selectedCustomerId) {
          setMessages(prev => [...prev, {
            id: data.id,
            from: data.from,
            to: data.to,
            content: data.content,
            timestamp: data.timestamp,
            direction: data.direction,
            customerId: data.customerId,
          }]);
        }
      }
    });

    // Listen for conversation updates
    socketRef.current.on('conversationUpdate', (data: any) => {
      if (data.platform === 'instagram') {
        setConversations(data.conversations);
      }
    });

    // Load conversations from backend
    const loadConversations = async () => {
      try {
        const response = await getInstagramConversations();
        setConversations(response.conversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
        // Show empty array if API fails
        setConversations([]);
      }
    };

    loadConversations();

    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('instagram-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Set up polling for real-time updates (fallback)
    const pollInterval = setInterval(() => {
      loadConversations();
      if (selectedCustomerId) {
        const loadConversationMessages = async () => {
          try {
            const response = await getInstagramMessages({ customerId: selectedCustomerId });
            setMessages(response.messages);
          } catch (error) {
            console.error('Failed to load conversation messages:', error);
          }
        };
        loadConversationMessages();
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(pollInterval);
    };
  }, [selectedCustomerId]);

  // Load conversation messages when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      const loadConversationMessages = async () => {
        try {
          const response = await getInstagramMessages({ customerId: selectedCustomerId });
          setMessages(response.messages);

          // Check if we should show typing indicator
          // Show typing if the last message is from user (inbound) and no recent AI response
          const lastMessage = response.messages[response.messages.length - 1];
          if (lastMessage && lastMessage.direction === 'inbound') {
            const messageTime = new Date(lastMessage.timestamp).getTime();
            const now = Date.now();
            const timeDiff = now - messageTime;
            // Show typing for up to 30 seconds after user message if no AI response
            setIsTyping(timeDiff < 30000 && !response.messages.some(m =>
              m.direction === 'outbound' &&
              new Date(m.timestamp).getTime() > messageTime
            ));
          } else {
            setIsTyping(false);
          }
        } catch (error) {
          console.error('Failed to load conversation messages:', error);
        }
      };
      loadConversationMessages();
    }
  }, [selectedCustomerId]);

  // Scroll to bottom only on first load or if user is at bottom
  useEffect(() => {
    if (!chatScrollRef.current) return;
    if (autoScroll) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, selectedCustomerId]);

  // Handler for scroll events in chat
  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const threshold = 120;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setShowScrollDown(!atBottom);
    setAutoScroll(atBottom);
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('instagram-settings', JSON.stringify(settings));
    // TODO: Save to backend API
    alert('Settings saved successfully!');
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await testInstagramConnection();
      setIsConnected(result.success);
      if (result.success) {
        alert(`Connection successful: ${result.message}`);
      } else {
        alert(`Connection failed: ${result.message}`);
      }
    } catch (error) {
      setIsConnected(false);
      alert('Connection test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedRecipient) {
      setIsTyping(true);
      console.log('Frontend: Attempting to send Instagram message to:', selectedRecipient, 'message:', newMessage);
      try {
        // Send message via API
        console.log('Frontend: Calling sendInstagramMessage API');
        const response = await sendInstagramMessage(selectedRecipient, newMessage);
        console.log('Frontend: API response:', response);

        // Add to local messages list
        const message: InstagramMessage = {
          id: Date.now().toString(),
          from: settings.businessAccountId,
          to: selectedRecipient,
          content: newMessage,
          timestamp: new Date().toISOString(),
          direction: 'outbound',
          customerId: selectedCustomerId,
        };
        setMessages(prev => [...prev, message]);
        setNewMessage('');

        // Show success toast
        toast({
          title: 'Message sent',
          description: 'Your message has been sent successfully.',
        });
      } catch (error) {
        console.error('Frontend: Failed to send message:', error);
        toast({
          title: 'Failed to send message',
          description: 'There was an error sending your message. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsTyping(false);
      }
    }
  };

  const formatInstagramId = (id: string) => {
    // Instagram IDs are typically numeric, so just return as is
    return id;
  };

  return (
    <div className="w-full h-[90vh] flex flex-col bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900 rounded-xl shadow overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {/* Conversations List */}
        <div className="w-full lg:w-[380px] bg-gradient-to-b from-purple-800 to-pink-800 border-r border-purple-700 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-purple-700 flex items-center gap-2 bg-gradient-to-r from-purple-800 to-pink-800 flex-shrink-0">
            <InstagramIcon className="h-5 w-5 text-pink-400" />
            <span className="text-lg font-semibold text-white">Instagram DMs</span>
          </div>
          <div className="flex-1 min-h-0">
            <div className="divide-y divide-purple-700 overflow-y-auto h-full">
              {conversations.length === 0 && (
                <div className="text-center text-white/60 py-8">No conversations</div>
              )}
              {conversations.map((conversation) => {
                const isActive = selectedRecipient === conversation.instagramId;
                return (
                  <div
                    key={conversation.customerId}
                    onClick={() => {
                      setSelectedRecipient(conversation.instagramId);
                      setSelectedCustomerId(conversation.customerId);
                    }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 cursor-pointer transition-all',
                      isActive ? 'bg-purple-700' : 'hover:bg-purple-700/50'
                    )}
                    style={{ minHeight: 72 }}
                  >
                    <Avatar className="h-12 w-12 shadow">
                      <AvatarFallback className="bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold">
                        {conversation.customerName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn('font-medium truncate', isActive ? 'text-white' : 'text-white/90')}>
                          {conversation.customerName}
                        </span>
                        <span className="text-xs text-pink-300 ml-2 whitespace-nowrap">
                          {conversation.latestTimestamp ? new Date(conversation.latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-pink-200 truncate max-w-[160px]">{conversation.latestMessage}</span>
                        {conversation.unreadCount > 0 && (
                          <span className="ml-2 bg-pink-500 text-xs text-white rounded-full px-2 py-0.5 font-semibold">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex flex-col flex-1 min-h-0">
          {selectedRecipient ? (
            <>
              <div className="flex-shrink-0 border-b border-purple-700 px-6 py-4 bg-gradient-to-r from-purple-800 to-pink-800">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-r from-pink-400 to-purple-400 text-white">
                      {conversations.find(c => c.instagramId === selectedRecipient)?.customerName.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-white">
                    {conversations.find(c => c.instagramId === selectedRecipient)?.customerName || 'Unknown Customer'}
                  </span>
                </div>
                <p className="text-xs text-pink-300 mt-1">
                  Instagram ID: {formatInstagramId(selectedRecipient)}
                </p>
              </div>
              <div className="flex-1 min-h-0 relative">
                <div
                  ref={chatScrollRef}
                  className="absolute inset-0 p-4 overflow-y-auto"
                  style={{ scrollBehavior: 'smooth', background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
                  onScroll={handleChatScroll}
                >
                  <div className="flex flex-col gap-2 pb-8">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'instagram-bubble px-4 py-2 rounded-2xl shadow-lg',
                            message.direction === 'outbound'
                              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-md'
                              : 'bg-white dark:bg-gray-800 text-black dark:text-white rounded-bl-md'
                          )}
                          style={{ maxWidth: '75%' }}
                        >
                          <p className="break-words whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1 text-right">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-2 text-sm max-w-[75%] shadow-lg">
                          <div className="flex items-center space-x-1">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-xs text-muted-foreground ml-2">AI is typing...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  {showScrollDown && (
                    <button
                      className="absolute right-4 bottom-4 z-10 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-lg p-2 flex items-center justify-center transition"
                      onClick={() => {
                        if (chatScrollRef.current) {
                          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
                        }
                        setAutoScroll(true);
                      }}
                      aria-label="Scroll to bottom"
                    >
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 5v14m0 0l-7-7m7 7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 items-end p-4 bg-gradient-to-r from-purple-800 to-pink-800 flex-shrink-0 border-t border-purple-700">
                <Textarea
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={1}
                  className="flex-1 rounded-3xl resize-none border-none bg-white dark:bg-gray-800 shadow focus:ring-0"
                  style={{ minHeight: 40, maxHeight: 120 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="icon"
                  className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg"
                  style={{ height: 40, width: 40 }}
                  aria-label="Send"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900">
              <div className="text-center text-white">
                <InstagramIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
