"use client";

import { useState } from "react";
import api from "../../lib/api";                 // Resolved relative to /app/search
import PostCard from "../../components/PostCard"; // Same-level sibling import

interface User {
  id: number;
  name: string;
  email?: string;
}
interface Post {
  id: number;
  title: string;
  body: string;
  image_url?: string;
  user: User;
  likeCount: number;
  commentCount: number;
  mine?: boolean;
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.get("/posts", { params: { q, limit: 20, offset: 0 } });
      setItems(res.data.items || []);
    } catch (err: any) {
      console.error(err);
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search posts..."
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={loading || !q.trim()}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="flex flex-col items-center gap-4">
        {items.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {!loading && items.length === 0 && q.trim() && (
          <p className="text-gray-500">No results.</p>
        )}
      </div>
    </div>
  );
}
