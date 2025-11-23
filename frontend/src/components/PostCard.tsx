"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "../lib/api";
import { assetUrl } from "../lib/url";
import { useAuth } from "../context/AuthContext";
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

export default function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthed = !!user;

  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(post.commentCount ?? 0);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const originalsRef = useRef<Map<number, Comment>>(new Map());
  const timersRef = useRef<
    Map<number, { timeout: ReturnType<typeof setTimeout>; interval: ReturnType<typeof setInterval> }>
  >(new Map());

  const visibleComments = comments.filter((c) => !c.pendingDelete);
  const currentCommentCount = showComments
    ? Math.max(visibleComments.length, commentCount)
    : commentCount;

  const isExpanded = (id: number) => expandedComments.has(id);
  const toggleExpand = (id: number) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const commentPreview = (text: string, expanded: boolean) => {
    const limit = 180;
    if (expanded || text.length <= limit) return text;
    return text.slice(0, limit) + "...";
  };

  

  const userLink = (u?: User) =>
    `/user/${encodeURIComponent(u?.name || String(u?.id || ""))}`;

  const requireLogin = () => {
    if (!isAuthed) {
      router.push("/auth/login");
      return false;
    }
    return true;
  };

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

  const toggleLike = async () => {
    if (!requireLogin()) return;
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

  const toggleComments = async () => {
    if (!showComments) {
      try {
        const res = await api.get(`/posts/${post.id}/comments`);
        const items = res.data.items || [];
        setComments(items);
        setCommentCount(items.length);
      } catch (err) {
        console.error(err);
      }
    }
    setShowComments(!showComments);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireLogin()) return;
    if (!commentBody.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.post(`/posts/${post.id}/comments`, {
        body: commentBody,
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
      };

      setComments((prev) => [...prev, withUser]);
      setCommentBody("");
      setCommentCount((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
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
        prev.map((c) => (c.id === commentId ? { ...c, body: updated.body } : c))
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
      prev.map((c) =>
        c.id === commentId ? { ...c, pendingDelete: true, remaining: 3 } : c
      )
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

  return (
    <div className="w-full max-w-xl rounded bg-white p-4 shadow">
      <div className="mb-3 flex items-center gap-3">
        <Avatar
          src={(post.user as any)?.avatarUrl}
          alt={post.user?.name || "User avatar"}
          size={40}
        />
        <div className="flex flex-col leading-tight">
          <Link
            href={userLink(post.user)}
            className="font-semibold hover:underline"
            title={`View ${post.user?.name}`}
          >
            {post.user?.name}
          </Link>
        </div>
        {post.mine && (
          <span className="ml-auto rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            mine
          </span>
        )}
      </div>

      {post.image_url && (
        <div className="relative mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(post.image_url)}
            alt={post.title}
            className="w-full rounded object-cover"
          />
        </div>
      )}

      <div className="mb-2 flex items-center gap-4">
        <button
          onClick={toggleComments}
          className="flex items-center gap-2 text-blue-600"
        >
          <Image src={commentIcon} alt="Comments" width={22} height={22} />
          <span className="text-base">{currentCommentCount}</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleLike}
            disabled={!isAuthed}
            title={isAuthed ? "Toggle like" : "Login to like"}
            className={`flex items-center gap-2 bg-transparent p-0 text-base ${
              !isAuthed ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"
            }`}
          >
            <Image
              src={liked ? likeOn : likeOff}
              alt="Like"
              width={22}
              height={22}
            />
            <span className="text-blue-600 text-base">{likeCount}</span>
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold">{post.title}</h3>
      <p className="mb-2">{post.body || post.content || post.excerpt || ""}</p>

      {showComments && (
        <div className="mt-4">
          <form onSubmit={handleComment} className="mb-2 flex gap-2">
            <input
              type="text"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={isAuthed ? "Add a comment..." : "Login to comment"}
              className="flex-1 rounded border p-2"
              disabled={!isAuthed || commentLoading}
            />
            <button
              type="submit"
              disabled={!isAuthed || commentLoading || !commentBody.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              title={isAuthed ? "Post comment" : "Login to comment"}
            >
              Post
            </button>
          </form>

          <div className="max-h-40 space-y-2 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2 border-b pb-2">
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
                          title={`View ${c.user?.name}`}
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
                              {commentPreview(c.body, isExpanded(c.id))}
                            </span>
                            {c.body.length > 180 && (
                              <button
                                type="button"
                                className="ml-1 text-xs font-semibold text-blue-600 hover:underline"
                                onClick={() => toggleExpand(c.id)}
                              >
                                {isExpanded(c.id) ? "Show less" : "Read more"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-3 pr-6 text-xs text-gray-500">
                        <button
                          className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                          onClick={async () => {
                            if (!requireLogin()) return;
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
                            width={16}
                            height={16}
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
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-gray-500">No comments yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




