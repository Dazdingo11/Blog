"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useMessages } from "../../context/MessagesContext";
import Avatar from "../../components/Avatar";
import Link from "next/link";

interface User {
  id: number;
  name: string;
  avatarUrl?: string | null;
}

interface Message {
  id: number;
  conversationId: number;
  sender: User;
  body: string;
  createdAt: string;
  isMine: boolean;
}

interface Conversation {
  id: number;
  participants: User[];
  otherParticipant: User | null;
  lastMessage: Message | null;
}

interface UserSearchResult {
  id: number;
  name: string;
  email?: string;
}

export default function MessagesPage() {
  const { user, socket } = useAuth();
  const {
    setUnreadFromConversations,
    clearUnread,
    removeConversation,
    startReading,
    stopReading,
  } = useMessages();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/auth/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoadingConversations(true);

        const to = searchParams.get("to");
        if (to) {
          const created = await api.post("/conversations", {
            userId: Number(to),
          });
          const convoId: number | undefined = created.data?.item?.id;
          if (convoId) {
            setActiveId(convoId);
          }
        }

        const res = await api.get("/conversations");
        setConversations(res.data.items || []);
        setUnreadFromConversations(res.data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingConversations(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || activeId == null) {
      setMessages([]);
      setHasMoreMessages(false);
      setSendError(null);
      return;
    }
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await api.get(`/conversations/${activeId}/messages`);
        const items: Message[] = res.data.items || [];
        setMessages(items);
        setHasMoreMessages(!!res.data.hasMore);
        clearUnread(activeId);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [user, activeId, clearUnread]);

  useEffect(() => {
    if (!socket || !user) return;

    const handler = (payload: { conversationId: number; message: Message }) => {
      const { conversationId, message } = payload;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], lastMessage: message };
        return updated;
      });

      setMessages((prev) => {
        if (activeId !== conversationId) return prev;
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("message:new", handler);
    return () => {
      socket.off("message:new", handler);
    };
  }, [socket, user, activeId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || activeId == null || sending) return;
    try {
      setSending(true);
      setSendError(null);
      const res = await api.post(`/conversations/${activeId}/messages`, {
        body: draft.trim(),
      });
      const msg: Message = res.data.item;
      setMessages((prev) => [...prev, msg]);
      setDraft("");
    } catch (e) {
      console.error(e);
      setSendError("Message failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const res = await api.get("/users/search", { params: { q } });
      setSearchResults(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const startConversationWith = async (targetId: number) => {
    try {
      const created = await api.post("/conversations", { userId: targetId });
      const convoId: number | undefined = created.data?.item?.id;
      const res = await api.get("/conversations");
      setConversations(res.data.items || []);
      if (convoId) {
        setActiveId(convoId);
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeConversation =
    conversations.find((c) => c.id === activeId) || null;
  const profileUrl = (u?: User | null) =>
    u ? `/user/${encodeURIComponent(u.name || String(u.id))}` : "#";

  const loadOlderMessages = async () => {
    if (
      !user ||
      activeId == null ||
      !hasMoreMessages ||
      loadingMore ||
      messages.length === 0
    ) {
      return;
    }
    try {
      setLoadingMore(true);
      const oldestId = messages[0].id;
      const res = await api.get(`/conversations/${activeId}/messages`, {
        params: { beforeId: oldestId, limit: 25 },
      });
      const older: Message[] = res.data.items || [];
      if (older.length === 0) {
        setHasMoreMessages(false);
        return;
      }
      setMessages((prev) => [...older, ...prev]);
      setHasMoreMessages(!!res.data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const deleteConversation = async (scope: "self" | "all") => {
    if (activeId == null) return;
    try {
      await api.delete(`/conversations/${activeId}`, { data: { scope } });
      setConversations((prev) => prev.filter((c) => c.id !== activeId));
      removeConversation(activeId);
      stopReading(activeId);
      setActiveId(null);
      setMessages([]);
      setHasMoreMessages(false);
      setSendError(null);
      setShowDeletePrompt(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Track active reader to keep badges in sync with the floating widget.
  useEffect(() => {
    if (activeId != null) {
      startReading(activeId);
      return () => stopReading(activeId);
    }
  }, [activeId, startReading, stopReading]);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col rounded-lg border bg-white shadow-sm">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-base font-semibold">Messages</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 border-r text-sm">
          <div className="border-b px-3 py-2 font-semibold text-gray-600">
            Chats
          </div>
          <form
            onSubmit={handleUserSearch}
            className="border-b px-3 py-2 text-xs"
          >
            <input
              className="w-full rounded border px-2 py-1 text-xs"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          {searchTerm.trim() && (
            <div className="border-b px-3 py-2 text-xs">
              {searchLoading ? (
                <div className="text-gray-500">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-gray-400">No users found.</div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startConversationWith(u.id)}
                      className="block w-full truncate text-left hover:text-blue-600"
                    >
                      {u.name} {u.email ? `(${u.email})` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="h-full overflow-y-auto">
            {loadingConversations ? (
              <div className="p-3 text-xs text-gray-500">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-3 text-xs text-gray-500">
                No conversations yet.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 ${
                    activeId === c.id ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Link
                      href={profileUrl(
                        c.otherParticipant || c.participants.find((p) => p.id !== user?.id) || null
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar
                        src={
                          c.otherParticipant?.avatarUrl ||
                          c.participants.find((p) => p.id !== user?.id)?.avatarUrl ||
                          null
                        }
                        alt={c.otherParticipant?.name || "User"}
                        size={32}
                        className="shrink-0"
                      />
                    </Link>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {c.otherParticipant?.name ||
                          c.participants.map((p) => p.name).join(", ")}
                      </div>
                      {c.lastMessage && (
                        <div className="truncate text-[11px] text-gray-500">
                          {c.lastMessage.body}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex flex-1 flex-col text-sm">
          {!activeConversation ? (
            <div className="flex flex-1 items-center justify-center text-xs text-gray-500">
              {conversations.length === 0
                ? "No conversations yet. Start one from a profile."
                : "Select a conversation on the left."}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Link
                    href={profileUrl(
                      activeConversation.otherParticipant ||
                        activeConversation.participants.find((p) => p.id !== user?.id) ||
                        null
                    )}
                    className="flex items-center gap-2"
                  >
                    <Avatar
                      src={
                        activeConversation.otherParticipant?.avatarUrl ||
                        activeConversation.participants.find((p) => p.id !== user?.id)?.avatarUrl ||
                        null
                      }
                      alt={activeConversation.otherParticipant?.name || "User"}
                      size={34}
                      className="shrink-0"
                    />
                    <span className="truncate">
                      {activeConversation.otherParticipant?.name ||
                        activeConversation.participants.map((p) => p.name).join(", ")}
                    </span>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  {showDeletePrompt ? (
                    <>
                      <button
                        onClick={() => deleteConversation("self")}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                      >
                        Delete for me
                      </button>
                      <button
                        onClick={() => deleteConversation("all")}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Delete for everyone
                      </button>
                      <button
                        onClick={() => setShowDeletePrompt(false)}
                        className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowDeletePrompt(true)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Delete chat
                    </button>
                  )}
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollTop === 0 && hasMoreMessages && !loadingMore) {
                    loadOlderMessages();
                  }
                }}
              >
                {loadingMessages ? (
                  <div className="text-xs text-gray-500">Loading...</div>
                ) : messages.length === 0 ? (
                  <div className="text-xs text-gray-400">No messages yet.</div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${
                        m.isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!m.isMine && (
                        <Link href={profileUrl(m.sender)} className="shrink-0">
                          <Avatar
                            src={m.sender?.avatarUrl || null}
                            alt={m.sender?.name || "User"}
                            size={28}
                            className="shrink-0"
                          />
                        </Link>
                      )}
                      <div
                        className={`max-w-[70%] rounded px-3 py-2 text-xs ${
                          m.isMine
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <div className="mb-0.5 text-[10px] opacity-75">
                          {m.isMine ? "You" : m.sender.name}
                        </div>
                        <div>{m.body}</div>
                      </div>
                      {m.isMine && (
                        <Link href={profileUrl(user as any)} className="shrink-0">
                          <Avatar
                            src={(user as any)?.avatarUrl || null}
                            alt="You"
                            size={28}
                            className="shrink-0"
                          />
                        </Link>
                      )}
                    </div>
                  ))
                )}
                {sendError && (
                  <div className="text-xs text-red-500">{sendError}</div>
                )}
              </div>
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t px-3 py-2"
              >
                <input
                  className="flex-1 rounded border px-3 py-2 text-xs"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="rounded bg-blue-600 px-4 py-2 text-xs text-white disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
