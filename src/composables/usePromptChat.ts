'use client';

import { editApi } from '@/api/edit.api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { UseVideoEditorReturn } from './useVideoEditor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionDetails?: string;
}

export function usePromptChat(editor: UseVideoEditorReturn) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_msg',
      role: 'assistant',
      content:
        'I am your AI Timeline Copilot. Try asking me:\n• "Add negative text to this frame for 5 seconds Make it full screen"\n• "Add times new roman text that says hi"\n• "Cut dead air from 00:04 to 00:08"\n• "Zoom in 20% on the speaker"',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Keep live references in effects to prevent stale closures in async callbacks without violating react-hooks/refs
  const editorRef = useRef(editor);
  const messagesRef = useRef(messages);

  useEffect(() => {
    editorRef.current = editor;
    messagesRef.current = messages;
  });

  const submitPrompt = useCallback(
    async (promptText: string) => {
      if (!promptText.trim() || isLoading) return;

      const userMsgId = `msg_${Date.now()}`;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          content: promptText,
          timestamp: now,
        },
      ]);

      setIsLoading(true);

      try {
        // Exclude system/initial greeting and keep active conversational turns
        const formattedHistory = messagesRef.current
          .filter((m) => m.id !== 'init_msg' && (m.role === 'user' || m.role === 'assistant'))
          .slice(-8)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        const currentEditor = editorRef.current;
        const response = await editApi.submitPrompt({
          prompt: promptText,
          history: formattedHistory,
          playhead: currentEditor.playhead,
          currentProject: currentEditor.project,
          mediaAssets: currentEditor.mediaAssets,
        });

        // Apply updated project state to editor
        currentEditor.setProject(response.updatedProject);

        // Add assistant response
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_ai_${Date.now()}`,
            role: 'assistant',
            content: response.actionDescription || 'Done! Applied edits to your project.',
            actionDetails: `Updated timeline state successfully.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err: unknown) {
        // Error toast is already triggered by editApi via api.ts!
        console.error('Failed to process prompt:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_err_${Date.now()}`,
            role: 'assistant',
            content: 'Sorry, I encountered an issue processing that edit. Please check your prompt and try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  return {
    messages,
    isLoading,
    submitPrompt,
  };
}
