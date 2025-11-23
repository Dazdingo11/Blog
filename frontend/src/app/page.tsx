"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import api from "../lib/api";
import PostCard from "../components/PostCard";

interface User {
  id: number;
  name: string;
  email?: string;
}
interface Post {
  id: number;
  title: string;
  body?: string;
  content?: string;
  image_url?: string;
  user: User;
  likeCount: number;
  commentCount: number;
  mine?: boolean;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const limit = 10;

  // State helpers that shouldn't trigger renders.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);            // block overlapping fetches
  const onceRef = useRef(false);               // ignore StrictMode double-mount
  const seenIdsRef = useRef<Set<number>>(new Set()); // global dedupe set

  const mergeAndDedupe = useCallback((incoming: Post[]) => {
    const unique: Post[] = [];
    for (const p of incoming) {
      if (!seenIdsRef.current.has(p.id)) {
        seenIdsRef.current.add(p.id);
        unique.push(p);
      }
    }
    setPosts(prev => [...prev, ...unique]);
  }, []);

  const fetchPosts = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await api.get("/posts", { params: { limit, offset } });
      const items: Post[] = res.data.items || [];

      // Dedupe at merge time.
      mergeAndDedupe(items);

      // Advance offset based on total returned, not just uniques.
      setOffset(prev => prev + items.length);

      if (items.length < limit) setHasMore(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, limit, mergeAndDedupe, offset]);

  // Initial load (run only once, even under StrictMode).
  useEffect(() => {
    if (onceRef.current) return;
    onceRef.current = true;
    fetchPosts();
  }, [fetchPosts]);

  // Infinite scroll observer.
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const io = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          // Double-check guard inside the observer.
          if (!loadingRef.current && hasMore) fetchPosts();
        }
      },
      { rootMargin: "200px 0px 400px 0px", threshold: 0.0 }
    );
    io.observe(el);
    return () => io.unobserve(el);
  }, [fetchPosts, hasMore]);

  return (
    <div className="flex flex-col items-center gap-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMore ? (
        <div ref={loadMoreRef} className="py-4 text-gray-500">
          {loading ? "Loading..." : "Scroll for more"}
        </div>
      ) : (
        <p className="text-gray-500 py-4">You have reached the end.</p>
      )}
    </div>
  );
}
