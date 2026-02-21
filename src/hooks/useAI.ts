import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { IBoardObject } from '@/types';
import { AIService, createToolExecutor } from '@/modules/ai';
import { getBoardRepository } from '@/lib/repositoryProvider';
import { normalizeAIErrorMessage } from '@/modules/ai/errors';
import { useViewportActionsStore } from '@/stores/viewportActionsStore';
import { useObjectsStore } from '@/stores/objectsStore';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface IUseAIParams {
  boardId: string | null;
  user: User | null;
}

interface IUseAIReturn {
  processCommand: (message: string) => Promise<void>;
  loading: boolean;
  error: string;
  messages: IChatMessage[];
  clearError: () => void;
  clearMessages: () => void;
}

export const useAI = ({ boardId, user }: IUseAIParams): IUseAIReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [messages, setMessages] = useState<IChatMessage[]>([]);

  const aiServiceRef = useRef<AIService | null>(null);
  const objectsRecord = useObjectsStore((s) => s.objects);
  const objects = useMemo(() => Object.values(objectsRecord) as IBoardObject[], [objectsRecord]);

  const zoomToFitAll = useViewportActionsStore((s) => s.zoomToFitAll);
  const zoomToSelection = useViewportActionsStore((s) => s.zoomToSelection);
  const setZoomLevel = useViewportActionsStore((s) => s.setZoomLevel);
  const exportViewport = useViewportActionsStore((s) => s.exportViewport);
  const exportFullBoard = useViewportActionsStore((s) => s.exportFullBoard);

  const executorContext = useMemo(() => {
    if (!boardId || !user) return null;

    const repo = getBoardRepository();

    return {
      boardId,
      createdBy: user.uid,
      userId: user.uid,
      getObjects: () => Object.values(useObjectsStore.getState().objects),
      createObject: repo.createObject,
      createObjectsBatch: repo.createObjectsBatch,
      updateObject: repo.updateObject,
      updateObjectsBatch: repo.updateObjectsBatch,
      deleteObject: repo.deleteObject,
      deleteObjectsBatch: repo.deleteObjectsBatch,
      ...(zoomToFitAll &&
        zoomToSelection &&
        setZoomLevel && {
          onZoomToFitAll: zoomToFitAll,
          onZoomToSelection: zoomToSelection,
          onSetZoomLevel: setZoomLevel,
        }),
      ...(exportViewport && {
        onExportViewport: exportViewport,
      }),
      ...(exportFullBoard && {
        onExportFullBoard: exportFullBoard,
      }),
    };
  }, [boardId, user, zoomToFitAll, zoomToSelection, setZoomLevel, exportViewport, exportFullBoard]);

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
    if (service) {
      service.updateBoardState(objects);
    }
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
      setError(normalizeAIErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = () => setError('');
  const clearMessages = () => setMessages([]);

  return {
    processCommand,
    loading,
    error,
    messages,
    clearError,
    clearMessages,
  };
};
