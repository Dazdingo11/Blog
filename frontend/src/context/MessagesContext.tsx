"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";

type UnreadMap = Record<number, number>;

interface MessagesContextValue {
  totalUnread: number;
  unreadByConversation: UnreadMap;
  setUnreadFromConversations: (
    items: { id: number; unreadCount?: number | null }[]
  ) => void;
  bumpUnread: (conversationId: number, amount?: number) => void;
  clearUnread: (conversationId: number) => void;
  removeConversation: (conversationId: number) => void;
  startReading: (conversationId: number) => void;
  stopReading: (conversationId: number) => void;
  isReading: (conversationId: number) => boolean;
}

const MessagesContext = createContext<MessagesContextValue>({
  totalUnread: 0,
  unreadByConversation: {},
  setUnreadFromConversations: () => {},
  bumpUnread: () => {},
  clearUnread: () => {},
  removeConversation: () => {},
  startReading: () => {},
  stopReading: () => {},
  isReading: () => false,
});

const capTotal = (map: UnreadMap) =>
  Math.min(
    99,
    Object.values(map).reduce((sum, count) => sum + count, 0)
  );

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [unreadByConversation, setUnreadByConversation] = useState<UnreadMap>(
    {}
  );
  const [readingCounts, setReadingCounts] = useState<Record<number, number>>(
    {}
  );

  const totalUnread = useMemo(
    () => capTotal(unreadByConversation),
    [unreadByConversation]
  );

  const setUnreadFromConversations = useCallback(
    (items: { id: number; unreadCount?: number | null }[]) => {
      setUnreadByConversation(() => {
        const next: UnreadMap = {};
        items.forEach((item) => {
          if (!item?.id) return;
          const count = Number(item.unreadCount || 0);
          next[item.id] = count > 0 ? count : 0;
        });
        return next;
      });
    },
    []
  );

  const bumpUnread = useCallback((conversationId: number, amount = 1) => {
    if (!conversationId || amount === 0) return;
    setUnreadByConversation((prev) => {
      const next = { ...prev };
      next[conversationId] = Math.max(0, (prev[conversationId] || 0) + amount);
      return next;
    });
  }, []);

  const clearUnread = useCallback((conversationId: number) => {
    if (!conversationId) return;
    setUnreadByConversation((prev) => {
      if (!(conversationId in prev)) return prev;
      if (prev[conversationId] === 0) return prev;
      const next = { ...prev, [conversationId]: 0 };
      return next;
    });
  }, []);

  const removeConversation = useCallback((conversationId: number) => {
    if (!conversationId) return;
    setUnreadByConversation((prev) => {
      if (!(conversationId in prev)) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const startReading = useCallback((conversationId: number) => {
    if (!conversationId) return;
    setReadingCounts((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || 0) + 1,
    }));
  }, []);

  const stopReading = useCallback((conversationId: number) => {
    if (!conversationId) return;
    setReadingCounts((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      const nextCount = prev[conversationId] - 1;
      if (nextCount <= 0) {
        delete next[conversationId];
      } else {
        next[conversationId] = nextCount;
      }
      return next;
    });
  }, []);

  const isReading = useCallback(
    (conversationId: number) => !!readingCounts[conversationId],
    [readingCounts]
  );

  useEffect(() => {
    if (!ready || !user) {
      setUnreadByConversation({});
      setReadingCounts({});
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/conversations");
        if (cancelled) return;
        const items = res.data.items || [];
        setUnreadFromConversations(items);
      } catch (e) {
        console.error("Failed to load unread counts", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user, setUnreadFromConversations]);

  return (
    <MessagesContext.Provider
      value={{
        totalUnread,
        unreadByConversation,
        setUnreadFromConversations,
        bumpUnread,
        clearUnread,
        removeConversation,
        startReading,
        stopReading,
        isReading,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export const useMessages = () => useContext(MessagesContext);
