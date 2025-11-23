"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessagesContext";
import messageIcon from "../assets/message.svg";
import Avatar from "./Avatar";

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
  unreadCount?: number;
}

type DeleteScope = "self" | "all";

export default function ChatWidget() {
  const { user, socket, ready } = useAuth();
  const {
    totalUnread,
    unreadByConversation,
    setUnreadFromConversations,
    bumpUnread,
    clearUnread,
    removeConversation,
    startReading,
    stopReading,
    isReading,
  } = useMessages();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    conversationId: number | null;
  }>({ open: false, x: 0, y: 0, conversationId: null });
  const previousActiveRef = useRef<number | null>(null);

  // Incoming messages
  useEffect(() => {
    if (!socket || !user) return;
    const handler = (payload: { conversationId: number; message: Message }) => {
      const { conversationId, message } = payload;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const unreadBump = !message.isMine && !isReading(conversationId) ? 1 : 0;
        updated[idx] = {
          ...updated[idx],
          lastMessage: message,
          unreadCount: (updated[idx].unreadCount || 0) + unreadBump,
        };
        return updated;
      });

      setMessages((prev) => {
        if (activeId !== conversationId) return prev;
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (!message.isMine && isReading(conversationId)) {
        api.post(`/conversations/${conversationId}/read`, { messageId: message.id }).catch(() => {});
      }

      if (!message.isMine && !isReading(conversationId)) {
        bumpUnread(conversationId, 1);
      }
    };
    socket.on("message:new", handler);
    return () => socket.off("message:new", handler);
  }, [socket, user, activeId, isReading, bumpUnread]);

  // Conversation deleted elsewhere
  useEffect(() => {
    if (!socket || !user) return;
    const handleDeleted = (payload: { conversationId: number }) => {
      const { conversationId } = payload;
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      removeConversation(conversationId);
      if (activeId === conversationId) {
        setActiveId(null);
        setMessages([]);
      }
    };
    socket.on("conversation:deleted", handleDeleted);
    return () => socket.off("conversation:deleted", handleDeleted);
  }, [socket, user, activeId, removeConversation]);

  // Reading state
  useEffect(() => {
    const prev = previousActiveRef.current;
    if (prev && prev !== activeId) {
      stopReading(prev);
    }
    if (open && activeId != null) {
      startReading(activeId);
    } else if (!open && activeId != null) {
      stopReading(activeId);
    }
    previousActiveRef.current = activeId;
  }, [open, activeId, startReading, stopReading]);

  // Sync unread badges
  useEffect(() => {
    setConversations((prev) =>
      prev.map((c) => {
        const count = unreadByConversation[c.id];
        if (typeof count === "undefined" || count === c.unreadCount) return c;
        return { ...c, unreadCount: count };
      })
    );
  }, [unreadByConversation]);

  // Load conversations when panel opens
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/conversations");
        const items = res.data.items || [];
        setConversations(items);
        setUnreadFromConversations(items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user, setUnreadFromConversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!open || !user || activeId == null) return;
    (async () => {
      try {
        const res = await api.get(`/conversations/${activeId}/messages`);
        const items = res.data.items || [];
        setMessages(items);
        if (items.length > 0) {
          const latestId = items[items.length - 1].id;
          try {
            await api.post(`/conversations/${activeId}/read`, { messageId: latestId });
            setConversations((prev) =>
              prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c))
            );
            clearUnread(activeId);
          } catch (e) {
            console.error(e);
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [activeId, open, user, clearUnread]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu.open) return;
    const handler = () => setContextMenu({ open: false, x: 0, y: 0, conversationId: null });
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu.open]);

  const toggleOpen = () => {
    if (!ready || !user) return;
    setOpen((v) => !v);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || activeId == null || sending) return;
    try {
      setSending(true);
      setError(null);
      const res = await api.post(`/conversations/${activeId}/messages`, {
        body: draft.trim(),
      });
      const msg: Message = res.data.item;
      setMessages((prev) => [...prev, msg]);
      setDraft("");
    } catch (e) {
      console.error(e);
      setError("Message failed to send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const deleteConversationWithScope = async (scope: DeleteScope, conversationId?: number | null) => {
    const targetId = conversationId ?? activeId;
    if (targetId == null) return;
    try {
      setDeleting(true);
      await api.delete(`/conversations/${targetId}`, { data: { scope } });
      setConversations((prev) => prev.filter((c) => c.id !== targetId));
      removeConversation(targetId);
      if (activeId === targetId) {
        stopReading(targetId);
        setActiveId(null);
        setMessages([]);
      }
      setContextMenu({ open: false, x: 0, y: 0, conversationId: null });
    } catch (e) {
      console.error(e);
      setError("Failed to delete chat. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const profileUrl = (userId?: number, name?: string) =>
    userId ? `/user/${encodeURIComponent(name || String(userId))}` : name ? `/user/${encodeURIComponent(name)}` : "#";

  if (!ready || !user) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-y-0 right-0 flex items-end md:items-start pointer-events-auto">
            <div className="pointer-events-auto flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl ring-1 ring-gray-200">
              <div className="flex items-center justify-between border-b p-3">
                <span className="font-semibold">Messages</span>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Close chat panel"
                >
                  X
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <aside className="w-40 border-r text-xs md:w-44">
                  <div className="border-b px-2 py-1 font-semibold text-gray-600">Chats</div>
                  <div className="h-full overflow-y-auto">
                    {loading ? (
                      <div className="p-2 text-xs text-gray-500">Loading...</div>
                    ) : conversations.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500">No conversations yet.</div>
                    ) : (
                      conversations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveId(c.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ open: true, x: e.clientX, y: e.clientY, conversationId: c.id });
                          }}
                          className={`relative block w-full px-2 py-1 text-left text-xs hover:bg-gray-100 ${
                            activeId === c.id ? "bg-gray-100" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Link
                              href={profileUrl(c.otherParticipant?.id, c.otherParticipant?.name)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Avatar
                                src={
                                  c.otherParticipant?.avatarUrl ||
                                  c.participants.find((p) => p.id !== user?.id)?.avatarUrl ||
                                  null
                                }
                                alt={c.otherParticipant?.name || "User"}
                                size={30}
                                className="shrink-0"
                              />
                            </Link>
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {c.otherParticipant?.name ||
                                  c.participants.map((p) => p.name).join(", ")}
                              </div>
                              {c.lastMessage && (
                                <div className="truncate text-[11px] text-gray-500">{c.lastMessage.body}</div>
                              )}
                            </div>
                          </div>
                          {c.unreadCount ? (
                            <span className="absolute right-2 top-1 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                              {c.unreadCount > 99 ? "99+" : c.unreadCount}
                            </span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </aside>

                <section className="flex flex-1 flex-col text-xs">
                  {!activeConversation ? (
                    <div className="flex flex-1 items-center justify-center text-gray-500">Select a chat</div>
                  ) : (
                    <>
                      <div className="border-b px-3 py-2 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <Link
                            href={profileUrl(
                              activeConversation.otherParticipant?.id,
                              activeConversation.otherParticipant?.name
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
                              size={30}
                              className="shrink-0"
                            />
                            <span className="truncate">
                              {activeConversation.otherParticipant?.name ||
                                activeConversation.participants.map((p) => p.name).join(", ")}
                            </span>
                          </Link>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
                        {messages.map((m) => (
                          <div
                            key={m.id}
                            className={`flex items-end gap-2 ${m.isMine ? "justify-end" : "justify-start"}`}
                          >
                            {!m.isMine && (
                              <Link href={profileUrl(m.sender?.id, m.sender?.name)} className="shrink-0">
                                <Avatar
                                  src={m.sender?.id !== user?.id ? m.sender?.avatarUrl || null : null}
                                  alt={m.sender?.name || "User"}
                                  size={26}
                                  className="shrink-0"
                                />
                              </Link>
                            )}
                            <div
                              className={`max-w-[80%] rounded px-2 py-1 ${
                                m.isMine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              <div className="text-[10px] opacity-75">{m.isMine ? "You" : m.sender.name}</div>
                              <div>{m.body}</div>
                            </div>
                            {m.isMine && (
                              <Link href={profileUrl(user?.id, user?.name)} className="shrink-0">
                                <Avatar
                                  src={user?.avatarUrl || null}
                                  alt="You"
                                  size={26}
                                  className="shrink-0"
                                />
                              </Link>
                            )}
                          </div>
                        ))}
                        {messages.length === 0 && (
                          <div className="text-[11px] text-gray-400">No messages yet.</div>
                        )}
                        {error && <div className="text-[11px] text-red-500">{error}</div>}
                      </div>

                      <form onSubmit={handleSend} className="flex items-center gap-2 border-t px-2 py-2">
                        <input
                          className="flex-1 rounded border px-2 py-1 text-xs"
                          placeholder="Type a message..."
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                        />
                        <button
                          type="submit"
                          disabled={!draft.trim() || sending}
                          className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                        >
                          Send
                        </button>
                      </form>
                    </>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-4 right-4 z-50 m-4 flex items-center justify-center rounded-full bg-white p-3 shadow-lg ring-1 ring-gray-200 transition hover:shadow-xl"
          title="Open messages"
          aria-label="Open messages"
        >
          <Image src={messageIcon} alt="Messages" width={24} height={24} />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}

      {contextMenu.open && contextMenu.conversationId != null && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu({ open: false, x: 0, y: 0, conversationId: null })}
        >
          <div
            className="absolute w-48 rounded-md border bg-white shadow-lg"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => {
                const convo = conversations.find((c) => c.id === contextMenu.conversationId);
                const other =
                  convo?.otherParticipant || convo?.participants.find((p) => p.id !== user?.id) || null;
                if (other) {
                  window.location.href = profileUrl(other.id, other.name);
                }
                setContextMenu({ open: false, x: 0, y: 0, conversationId: null });
              }}
            >
              View profile
            </button>
            <button
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
              disabled={deleting}
              onClick={() => deleteConversationWithScope("self", contextMenu.conversationId)}
            >
              Delete for me
            </button>
            <button
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              disabled={deleting}
              onClick={() => deleteConversationWithScope("all", contextMenu.conversationId)}
            >
              Delete for everyone
            </button>
            <button
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => setContextMenu({ open: false, x: 0, y: 0, conversationId: null })}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
