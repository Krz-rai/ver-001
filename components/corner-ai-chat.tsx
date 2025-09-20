"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Bot, MessageSquarePlus, Send } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { cn } from '@/lib/utils';

// AI elements UI kit
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { Response } from "@/components/ai-elements/response";
import { Actions, Action } from "@/components/ai-elements/actions";

// Simple chat implementation using ai-elements components
export default function CornerAIChat({ defaultCalendarId }: { defaultCalendarId?: Id<"calendars"> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const calendars = useQuery(api.calendars.getUserCalendars);
  const calendarId = defaultCalendarId || calendars?.find(cal => cal.isDefault)?._id || calendars?.[0]?._id;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Get current date and upcoming events for context
  const currentDate = new Date();
  const upcomingEvents = useQuery(api.events.getUserEvents, {
    startDate: Math.floor(currentDate.getTime() / 1000),
    endDate: Math.floor(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).getTime() / 1000),
  });

  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
    setInput("");
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
  };

  const suggestedPrompts = [
    "What's on my schedule today?",
    "Find me a 2-hour slot this week",
    "When is my next meeting?",
    "Show me free time tomorrow"
  ];

  const handleSuggestedPrompt = async (prompt: string) => {
    if (isLoading) return;
    
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get the Convex site URL dynamically
      const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/.cloud$/, ".site") || 
                           window.location.origin;
      
      // Format upcoming events for AI context
      const eventsContext = upcomingEvents ? upcomingEvents.map(event => {
        const startDate = new Date(event.startTime * 1000);
        const endDate = new Date(event.endTime * 1000);
        return `- ${event.title}: ${startDate.toISOString().split('T')[0]} ${startDate.toISOString().split('T')[1].split('.')[0]} UTC - ${endDate.toISOString().split('T')[1].split('.')[0]} UTC${event.description ? ' (' + event.description + ')' : ''}`;
      }).join('\n') : 'No upcoming events found.';

      const systemPrompt = `You are a helpful AI assistant for a calendar application. Help users with their schedule management, event planning, and calendar-related questions. Be concise and helpful.

Current date and time: ${new Date().toISOString().replace('T', ' ').split('.')[0]} UTC

User's upcoming events (next 7 days):
${eventsContext}

When users ask about their schedule, free time, or availability, use this calendar data to provide accurate information. For "free time" requests, analyze the gaps between events and suggest available time slots.`;
      
      const response = await fetch(`${convexSiteUrl}/api/cerebras-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              id: `system-${Date.now()}`,
              role: 'system',
              content: systemPrompt,
            },
            userMessage
          ],
          model: 'qwen-3-coder-480b',
          temperature: 0.7,
          stream: false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content: result.text || 'I apologize, but I couldn\'t process your request.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    handleSuggestedPrompt(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
          size="lg"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </div>

      {/* Chat Modal */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl h-[600px] p-0 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg" showCloseButton={false}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="font-semibold text-gray-900 dark:text-white">AI Assistant</DialogTitle>
            </div>
            <Actions>
              <Action onClick={handleNewChat} label="New Chat">
                <MessageSquarePlus className="size-4" />
              </Action>
            </Actions>
          </div>

          <div className="flex flex-col h-[520px] bg-white dark:bg-neutral-950 overflow-hidden rounded-b-xl">
            <Conversation className="flex-1 overflow-hidden">
              <ConversationContent ref={scrollContainerRef} className="p-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {messages.length === 0 ? (
                  <ConversationEmptyState className="text-center">
                    <div className="space-y-4">
                      <Bot className="w-12 h-12 text-blue-200 mx-auto" />
                      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                        AI Schedule Assistant
                      </h3>
                      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                        I'm here to help you with your schedule! Ask me about your upcoming events, find free time slots, or get suggestions for optimal meeting times.
                      </p>
                      <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                        {suggestedPrompts.map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestedPrompt(prompt)}
                            className="text-left justify-start h-auto py-2 px-3"
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </ConversationEmptyState>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <Message key={message.id} from={message.role}>
                        <MessageContent
                          variant="flat"
                          className={cn(
                            "relative",
                            message.role === "assistant" && "bg-neutral-50 dark:bg-neutral-900/50 rounded-lg px-4 py-3"
                          )}
                        >
                          <Response className="text-sm text-neutral-900 dark:text-neutral-100">{message.content}</Response>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </MessageContent>
                      </Message>
                    ))}
                    {isLoading && (
                      <div className="py-4">
                        <Loader />
                      </div>
                    )}
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {/* Input Area */}
            <div className="border-t border-neutral-200/50 dark:border-neutral-800/50 bg-white dark:bg-neutral-950 flex-shrink-0">
              <div className="p-4">
                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your schedule..."
                      disabled={isLoading}
                      rows={1}
                      className="w-full resize-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      style={{
                        minHeight: '40px',
                        maxHeight: '120px',
                      }}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="sm"
                    className="h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl -mt-2"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}
