import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';
import { AIService, createToolExecutor } from '@/modules/ai';
import { createObject, updateObject, deleteObject } from '@/modules/sync/objectService';
import { AIError } from '@/modules/ai/errors';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface IUseAIParams {
  boardId: string | null;
  user: User | null;
  objects: IBoardObject[];
}

interface IUseAIReturn {
  processCommand: (message: string) => Promise<void>;
  loading: boolean;
  error: string;
  messages: IChatMessage[];
  clearError: () => void;
  clearMessages: () => void;
}

export const useAI = ({ boardId, user, objects }: IUseAIParams): IUseAIReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [messages, setMessages] = useState<IChatMessage[]>([]);

  const aiServiceRef = useRef<AIService | null>(null);
  const objectsRef = useRef<IBoardObject[]>(objects);
  objectsRef.current = objects;

  const executorContext = useMemo(() => {
    if (!boardId || !user) return null;
    return {
      boardId,
      createdBy: user.uid,
      getObjects: () => objectsRef.current,
      createObject,
      updateObject,
      deleteObject,
    };
  }, [boardId, user]);

  const executor = useMemo(() => {
    if (!executorContext) return null;
    return createToolExecutor(executorContext);
  }, [executorContext]);

  useEffect(() => {
    if (!executor) {
      aiServiceRef.current = null;
      return;
    }
    aiServiceRef.current = new AIService((tool) => executor.execute(tool));
    return () => {
      aiServiceRef.current = null;
    };
  }, [executor]);

  useEffect(() => {
    const service = aiServiceRef.current;
    if (service) service.updateBoardState(objects);
  }, [objects]);

  const processCommand = useCallback(async (userMessage: string) => {
    const service = aiServiceRef.current;
    if (!service || !userMessage.trim()) return;

    setError('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: userMessage.trim() }]);

    try {
      const response = await service.processCommand(userMessage.trim());
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      const message =
        err instanceof AIError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'AI request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(''), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    processCommand,
    loading,
    error,
    messages,
    clearError,
    clearMessages,
  };
};
