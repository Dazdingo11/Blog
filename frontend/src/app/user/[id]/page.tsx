"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "../../../components/Avatar";
import Image from "next/image";
import shareIcon from "../../../assets/share.svg";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import { assetUrl } from "../../../lib/url";
import PostLightbox from "../../../components/PostLightbox";

interface Profile {
  id: number;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  userId?: number;
}
interface User {
  id: number;
  name: string;
  avatarUrl?: string | null;
}
interface Post {
  id: number;
  title: string;
  image_url?: string;
  body?: string;
  content?: string;
  excerpt?: string;
  likeCount: number;
  commentCount: number;
  user: User;
  likedByMe?: boolean;
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const slug = params.id;
  const router = useRouter();
const { user } = useAuth();

  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [profileUserName, setProfileUserName] = useState<string>("");
  const isSelf = user?.id === profileUserId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [shareModal, setShareModal] = useState<{ open: boolean; copied: boolean }>({
    open: false,
    copied: false,
  });
  const [followModal, setFollowModal] = useState<{
    open: boolean;
    mode: "followers" | "following";
    loading: boolean;
    items: { id: number; name: string; avatarUrl?: string | null; isFollowing?: boolean }[];
    search: string;
  }>({ open: false, mode: "followers", loading: false, items: [], search: "" });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [p, ps] = await Promise.all([
          api.get(`/profile/${slug}`),
          api.get(`/posts`, { params: { owner: slug } }),
        ]);
        const prof = p.data.item?.profile ?? null;
        const userInfo = p.data.item?.user ?? null;
        setProfile(prof);
        if (userInfo?.name) setProfileUserName(userInfo.name);
        if (prof?.userId) setProfileUserId(prof.userId);
        setPosts(ps.data.items || []);
        if (prof && typeof (prof as any).isFollowing === "boolean") {
          setIsFollowing((prof as any).isFollowing);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const toggleFollow = async () => {
    if (!user) return router.push("/auth/login");
    if (isSelf) return;
    try {
      const next = !isFollowing;
      setIsFollowing(next);
      if (next) {
        await api.post(`/profile/${profileUserId}/follow`);
        setProfile((p) =>
          p
            ? { ...p, followersCount: (p.followersCount || 0) + 1 }
            : p
        );
      } else {
        await api.delete(`/profile/${profileUserId}/follow`);
        setProfile((p) =>
          p
            ? {
                ...p,
                followersCount: Math.max((p.followersCount || 1) - 1, 0),
              }
            : p
        );
      }
    } catch (e) {
      console.error(e);
      setIsFollowing((v) => !v);
    }
  };

  const mainName = profileUserName || "User";
  const subName = profile?.displayName || `@${profileUserName || ""}`;
  const handleShareCopy = async () => {
    const profileSlug = encodeURIComponent(profileUserName || String(profileUserId || ""));
    const profileUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/user/${profileSlug}`
        : `/user/${profileSlug}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setShareModal({ open: true, copied: true });
      setTimeout(() => setShareModal((prev) => ({ ...prev, copied: false })), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const openFollowModal = async (mode: "followers" | "following") => {
    const targetSlug = profileUserName || profileUserId || slug;
    setFollowModal((prev) => ({ ...prev, open: true, mode, loading: true, items: [], search: "" }));
    try {
      const res = await api.get(`/profile/${targetSlug}/${mode}`);
      setFollowModal((prev) => ({
        ...prev,
        loading: false,
        items: res.data.items || [],
      }));
    } catch (err) {
      console.error("Failed to load follow list", err);
      setFollowModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const filteredFollows = followModal.items.filter((i) =>
    i.name.toLowerCase().includes(followModal.search.toLowerCase())
  );

  if (loading)
    return <div className="mx-auto max-w-5xl p-6">Loading...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr] md:items-start">
        <div className="flex justify-center md:block">
          <Avatar
            src={profile?.avatarUrl || null}
            alt={profile?.displayName || "User avatar"}
            size={176}
            className="ring-2 ring-gray-200 bg-gray-50"
          />
        </div>
        <div className="flex flex-col items-center md:items-start">
          <div className="text-xl font-semibold">
            {mainName}
          </div>
          <div className="text-sm text-gray-600">
            {subName}
          </div>
          {profile?.bio && (
            <p className="mt-2 max-w-prose text-center md:text-left">
              {profile.bio}
            </p>
          )}
          <div className="mt-3 flex items-center gap-6 text-sm">
            <div>
              <span className="font-semibold">{posts.length}</span> posts
            </div>
            <button
              className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-100"
              onClick={() => openFollowModal("followers")}
            >
              <span className="font-semibold">
                {profile?.followersCount ?? 0}
              </span>{" "}
              followers
            </button>
            <button
              className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-100"
              onClick={() => openFollowModal("following")}
            >
              <span className="font-semibold">
                {profile?.followingCount ?? 0}
              </span>{" "}
              following
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {!isSelf && (
              <>
                <button
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  onClick={toggleFollow}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
                <button
                  className="rounded-md border px-4 py-2 hover:bg-gray-50"
                  onClick={() =>
                    router.push(`/messages?to=${profileUserId}`)
                  }
                >
                  Message
                </button>
              </>
            )}
            <button
              className="flex items-center gap-2 rounded-md border px-4 py-2 hover:bg-gray-50"
              onClick={() => setShareModal({ open: true, copied: false })}
            >
              <Image src={shareIcon} alt="Share" width={16} height={16} />
              <span>Share profile</span>
            </button>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {posts.map((p) => (
            <button
              key={p.id}
              className="group relative block aspect-square overflow-hidden rounded"
              onClick={() => setActivePost(p)}
              title={p.title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  p.image_url
                    ? assetUrl(p.image_url)
                    : "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA=="
                }
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/30 text-white backdrop-blur-[1px] group-hover:flex">
                <span>Likes {p.likeCount ?? 0}</span>
                <span>Comments {p.commentCount ?? 0}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {activePost && (
        <PostLightbox
          post={activePost}
          onClose={() => setActivePost(null)}
        />
      )}

      {shareModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShareModal({ open: false, copied: false })}
          />
          <div
            className="relative z-10 w-[90vw] max-w-md rounded-lg bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Share profile</div>
              <button
                className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setShareModal({ open: false, copied: false })}
              >
                X
              </button>
            </div>
            <div className="mb-3 text-sm text-gray-600">
              Copy this link to share the profile.
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/user/${encodeURIComponent(
                        profileUserName || String(profileUserId || "")
                      )}`
                    : `/user/${encodeURIComponent(profileUserName || String(profileUserId || ""))}`
                }
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <button
                onClick={handleShareCopy}
                className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                <Image src={shareIcon} alt="Copy" width={16} height={16} />
                Copy
              </button>
            </div>
            {shareModal.copied && (
              <div className="mt-2 text-xs text-green-600">URL copied</div>
            )}
          </div>
        </div>
      )}

      {followModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setFollowModal((prev) => ({ ...prev, open: false }))}
          />
          <div
            className="relative z-10 w-[90vw] max-w-md rounded-lg bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold capitalize">
                {followModal.mode}
              </div>
              <button
                className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setFollowModal((prev) => ({ ...prev, open: false }))}
              >
                X
              </button>
            </div>
            <input
              type="text"
              value={followModal.search}
              onChange={(e) =>
                setFollowModal((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search..."
              className="mb-3 w-full rounded border px-3 py-2 text-sm"
            />
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {followModal.loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : filteredFollows.length === 0 ? (
                <div className="text-sm text-gray-500">No results.</div>
              ) : (
                filteredFollows.map((u) => (
                  <Link
                    key={u.id}
                    href={`/user/${encodeURIComponent(u.name || String(u.id))}`}
                    className="flex items-center gap-2 rounded px-2 py-2 hover:bg-gray-50"
                  >
                    <Avatar
                      src={u.avatarUrl || null}
                      alt={u.name}
                      size={36}
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{u.name}</div>
                      {u.isFollowing && (
                        <div className="text-[11px] text-green-600">Following</div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
