"use client";

import { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { assetUrl } from "../lib/url";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import likeOn from "../assets/liked.svg";
import likeOff from "../assets/likenotclicked.svg";
import commentIcon from "../assets/comment.svg";
import Avatar from "./Avatar";

interface User {
  id: number;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

interface Comment {
  id: number;
  body: string;
  user: User;
  createdAt: string;
  likeCount?: number;
  likedByMe?: boolean;
  expanded?: boolean;
  pendingDelete?: boolean;
  remaining?: number;
}

interface Post {
  id: number;
  title: string;
  body?: string;
  content?: string;
  excerpt?: string;
  image_url?: string;
  user: User;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  mine?: boolean;
}

export default function PostLightbox({
  post,
  onClose,
}: {
  post: Post;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const isAuthed = !!user;

  const userLink = (u?: User) =>
    `/user/${encodeURIComponent(u?.name || String(u?.id || ""))}`;

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(post.commentCount ?? 0);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const originalsRef = useRef<Map<number, Comment>>(new Map());
  const timersRef = useRef<
    Map<number, { timeout: ReturnType<typeof setTimeout>; interval: ReturnType<typeof setInterval> }>
  >(new Map());

  const clearTimers = (commentId?: number) => {
    const map = timersRef.current;
    if (typeof commentId === "number") {
      const entry = map.get(commentId);
      if (entry) {
        clearTimeout(entry.timeout);
        clearInterval(entry.interval);
      }
      map.delete(commentId);
      return;
    }
    map.forEach((entry) => {
      clearTimeout(entry.timeout);
      clearInterval(entry.interval);
    });
    map.clear();
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (actionId !== null && !comments.find((c) => c.id === actionId)) {
      setActionId(null);
    }
  }, [comments, actionId]);

  // Load comments when the lightbox opens.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/posts/${post.id}/comments`);
        if (mounted) {
          const items = res.data.items || [];
          setComments(items);
          setCommentCount(items.length);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthed || !commentBody.trim()) return;
    try {
      setSending(true);
      const res = await api.post(`/posts/${post.id}/comments`, {
        body: commentBody.trim(),
      });
      const created = res.data.item;
      const withUser: Comment = {
        ...created,
        user: {
          id: user!.id,
          name: user!.name,
          email: user!.email,
          avatarUrl: (user as any)?.avatarUrl || null,
        },
        likeCount: 0,
        likedByMe: false,
        expanded: false,
      };
      setComments((prev) => [...prev, withUser]);
      setCommentBody("");
      setCommentCount((prev) => prev + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditBody(c.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBody("");
  };

  const saveEdit = async (commentId: number) => {
    if (!editBody.trim()) return;
    try {
      const res = await api.put(`/comments/${commentId}`, { body: editBody.trim() });
      const updated = res.data.item;
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, body: updated.body, expanded: true } : c
        )
      );
      setEditingId(null);
      setEditBody("");
    } catch (err) {
      console.error(err);
    }
  };

  const deleteComment = async (commentId: number) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;

    originalsRef.current.set(commentId, target);
    clearTimers(commentId);

    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, pendingDelete: true, remaining: 3 } : c))
    );
    setCommentCount((prev) => Math.max(prev - 1, 0));

    const interval = setInterval(() => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId && c.pendingDelete
            ? { ...c, remaining: Math.max((c.remaining ?? 3) - 1, 0) }
            : c
        )
      );
    }, 1000);

    const timeout = setTimeout(async () => {
      try {
        await api.delete(`/comments/${commentId}`);
        setComments((prev) => prev.filter((c) => !(c.id === commentId && c.pendingDelete)));
      } catch (err) {
        console.error(err);
        const original = originalsRef.current.get(commentId);
        if (original) {
          setComments((prev) =>
            prev.map((c) => (c.id === commentId && c.pendingDelete ? original : c))
          );
        }
        setCommentCount((prev) => prev + 1);
      } finally {
        clearTimers(commentId);
        originalsRef.current.delete(commentId);
      }
    }, 3000);

    timersRef.current.set(commentId, { interval, timeout });
  };

  const undoDelete = (commentId: number) => {
    const original = originalsRef.current.get(commentId);
    if (!original) return;
    clearTimers(commentId);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId && c.pendingDelete ? original : c))
    );
    setCommentCount((prev) => prev + 1);
    originalsRef.current.delete(commentId);
  };

  const toggleLike = async () => {
    if (!isAuthed) return;
    try {
      if (liked) {
        const res = await api.delete(`/posts/${post.id}/like`);
        setLikeCount(res.data.likeCount);
        setLiked(false);
      } else {
        const res = await api.post(`/posts/${post.id}/like`);
        setLikeCount(res.data.likeCount);
        setLiked(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const description = post.body || post.content || post.excerpt || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 grid h-[88vh] w-[min(96vw,1100px)] grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[60%_40%]">
        <div className="relative flex items-center justify-center bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              post.image_url
                ? assetUrl(post.image_url)
                : "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA=="
            }
            alt=""
            className="max-h-full max-w-full object-contain"
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-sm shadow hover:bg-white"
            aria-label="Close"
          >
            X
          </button>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="border-b px-4 py-3">
            <h3 className="truncate text-base font-semibold">{post.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <Avatar
                src={(post.user as any)?.avatarUrl}
                alt={post.user?.name || "User"}
                size={28}
              />
              <span>by</span>
              <Link
                href={userLink(post.user)}
                className="underline hover:text-gray-700"
              >
                {post.user?.name}
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLike}
                disabled={!isAuthed}
                className={`flex items-center gap-2 bg-transparent p-0 text-sm ${
                  !isAuthed ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"
                }`}
                title={isAuthed ? "Toggle like" : "Log in to like"}
              >
                <Image
                  src={liked ? likeOn : likeOff}
                  alt={liked ? "Liked" : "Not liked"}
                  width={22}
                  height={22}
                />
                <span className="text-sm text-gray-800">{likeCount}</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-base text-gray-700">
              <Image src={commentIcon} alt="Comments" width={22} height={22} />
              <span>{commentCount}</span>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Description
            </div>
            <div className="text-sm text-gray-800">{description || ""}</div>
          </div>

          <div className="mt-1 flex-1 overflow-y-auto px-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Comments
            </div>
            {loading ? (
              <p className="py-2 text-gray-500">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="py-2 text-gray-500">No comments yet.</p>
            ) : (
              <ul className="space-y-3 py-2">
                {comments.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 border-b pb-2">
                    {c.pendingDelete ? (
                      <div className="flex w-full items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <span>Deleting... {c.remaining ?? 5}s</span>
                        <button
                          onClick={() => undoDelete(c.id)}
                          className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                        >
                          Undo
                        </button>
                      </div>
                    ) : (
                      <>
                        <Avatar
                          src={c.user?.avatarUrl}
                          alt={c.user?.name || "User"}
                          size={28}
                          className="shrink-0"
                        />
                        <div className="flex flex-1 flex-col text-sm">
                          <div
                            onClick={() =>
                              c.user?.id === user?.id &&
                              setActionId((prev) => (prev === c.id ? null : c.id))
                            }
                            className={c.user?.id === user?.id ? "cursor-pointer" : ""}
                          >
                            <Link
                              href={userLink(c.user)}
                              className="font-semibold hover:underline"
                            >
                              {c.user?.name}
                            </Link>{" "}
                            {editingId === c.id ? (
                              <>
                                <textarea
                                  value={editBody}
                                  onChange={(e) => setEditBody(e.target.value)}
                                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                                  rows={2}
                                />
                                <div className="mt-1 flex gap-2">
                                  <button
                                    type="button"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={() => saveEdit(c.id)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-gray-600 hover:underline"
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-700">
                                  {c.body.length > 180 && !c.expanded
                                    ? `${c.body.slice(0, 180)}...`
                                    : c.body}
                                </span>
                                {c.body.length > 180 && (
                                  <button
                                    type="button"
                                    className="ml-1 text-xs font-semibold text-blue-600 hover:underline"
                                    onClick={() =>
                                      setComments((prev) =>
                                        prev.map((cm) =>
                                          cm.id === c.id
                                            ? { ...cm, expanded: !cm.expanded }
                                            : cm
                                        )
                                      )
                                    }
                                  >
                                    {c.expanded ? "Show less" : "Read more"}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          <div className="mt-1 flex items-center justify-end gap-2 pr-6 text-xs text-gray-500">
                            <button
                              className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                              onClick={async () => {
                                if (!isAuthed) return;
                                try {
                                  if (c.likedByMe) {
                                    const res = await api.delete(`/comments/${c.id}/like`);
                                    setComments((prev) =>
                                      prev.map((cm) =>
                                        cm.id === c.id
                                          ? {
                                              ...cm,
                                              likeCount: res.data.likeCount ?? 0,
                                              likedByMe: false,
                                            }
                                          : cm
                                      )
                                    );
                                  } else {
                                    const res = await api.post(`/comments/${c.id}/like`);
                                    setComments((prev) =>
                                      prev.map((cm) =>
                                        cm.id === c.id
                                          ? {
                                              ...cm,
                                              likeCount: res.data.likeCount ?? 0,
                                              likedByMe: true,
                                            }
                                          : cm
                                      )
                                    );
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                            >
                              <Image
                                src={c.likedByMe ? likeOn : likeOff}
                                alt="Like comment"
                                width={14}
                                height={14}
                              />
                              <span>{c.likeCount ?? 0}</span>
                            </button>
                            {c.user?.id === user?.id &&
                              (actionId === c.id || editingId === c.id) && (
                              <>
                                <button
                                  className="text-xs text-gray-600 hover:text-blue-600"
                                  onClick={() => startEdit(c)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="text-xs text-red-600 hover:text-red-700"
                                  onClick={() => deleteComment(c.id)}
                                >
                                  Delete
                                </button>
                              </>
                              )}
                          </div>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isAuthed ? (
            <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
              <input
                className="flex-1 rounded border px-3 py-2"
                placeholder="Add a comment..."
                disabled={sending}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button
                type="submit"
                disabled={sending || !commentBody.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Post
              </button>
            </form>
          ) : (
            <div className="border-t p-3 text-sm text-gray-600">
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 underline">
                Log in
              </Link>{" "}
              to add a comment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
