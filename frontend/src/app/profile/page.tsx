"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { assetUrl } from "../../lib/url";
import Avatar from "../../components/Avatar";
import defaultAvatar from "../../assets/avatardefault.svg";
import shareIcon from "../../assets/share.svg";
import ProfileForm from "../../components/ProfileForm";
import PostLightbox from "@/components/PostLightbox";
import ProfileEditModal from "../../components/ProfileEditModal";

interface Profile {
  id: number;
  displayName?: string;   // Preferred display name
  avatarUrl?: string;
  bio?: string;
  followersCount?: number;  // Provided by backend
  followingCount?: number;  // Provided by backend
}

interface User {
  id: number;
  name: string; // Account name used for login
  email?: string;
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
  mine?: boolean;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showEdit, setShowEdit] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [viewAvatar, setViewAvatar] = useState(false);
  const [followModal, setFollowModal] = useState<{
    open: boolean;
    mode: "followers" | "following";
    loading: boolean;
    items: { id: number; name: string; avatarUrl?: string | null; isFollowing?: boolean }[];
    search: string;
  }>({ open: false, mode: "followers", loading: false, items: [], search: "" });
  const [shareModal, setShareModal] = useState<{ open: boolean; copied: boolean }>({
    open: false,
    copied: false,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fallbackAvatar =
    (defaultAvatar as { src?: string }).src || (defaultAvatar as unknown as string);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resProfile, resPosts] = await Promise.all([
        api.get("/profile/me"),
        api.get("/posts", { params: { owner: "me" } }),
      ]);
      setProfile(resProfile.data.item?.profile ?? null);
      setPosts(resPosts.data.items || []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        router.push("/auth/login");
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const postsCount = posts.length;
  const followersCount = profile?.followersCount ?? 0; // Filled by API when supported
  const followingCount = profile?.followingCount ?? 0; // Filled by API when supported

  const username = user?.name || "User";
  const nickname = profile?.displayName || "";
  const displayName = useMemo(() => username, [username]);

  // --- Avatar interaction ---
  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onChooseAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview immediately.
    const local = URL.createObjectURL(file);
    setAvatarPreview(local);

    try {
      // Upload expects backend to return { url: '/uploads/...' }.
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/profile/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url: string = up.data?.url;
      if (url) {
        const patch = await api.put("/profile/me", { avatarUrl: url });
        setProfile(patch.data.item?.profile ?? { ...(profile || {}), avatarUrl: url });
        setAvatarMenuOpen(false);
        updateUser({ avatarUrl: url });
      }
    } catch (err) {
      console.error("Avatar upload failed", err);
    }
  };

  // Close avatar menu on outside click
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [avatarMenuOpen]);

  if (!user) return <p className="mt-8 text-center">Redirecting...</p>;

  const profileShareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/user/${encodeURIComponent(username)}`
      : "";

  const copyShareUrl = async () => {
    if (!profileShareUrl) return;
    try {
      await navigator.clipboard.writeText(profileShareUrl);
      setShareModal({ open: true, copied: true });
      setTimeout(() => setShareModal((prev) => ({ ...prev, copied: false })), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const openFollowModal = async (mode: "followers" | "following") => {
    if (!profile?.userId && !user?.id) return;
    const targetId = profile?.userId || user?.id;
    setFollowModal((prev) => ({ ...prev, open: true, mode, loading: true, items: [], search: "" }));
    try {
      const res = await api.get(`/profile/${targetId}/${mode}`);
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

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr] md:items-start">
        <div className="relative flex justify-center md:block">
          <Avatar
            src={avatarPreview || profile?.avatarUrl || null}
            alt={profile?.displayName || user?.name || "User avatar"}
            size={176}
            className="cursor-pointer ring-2 ring-gray-200"
            onClick={() => setAvatarMenuOpen((v) => !v)}
          />

          {avatarMenuOpen && (
            <div
              ref={menuRef}
              className="absolute left-1/2 z-20 mt-2 w-48 -translate-x-1/2 overflow-hidden rounded-xl border bg-white shadow-lg"
            >
              <button
                className="block w-full px-4 py-2 text-left hover:bg-gray-50"
                onClick={() => {
                  setViewAvatar(true);
                  setAvatarMenuOpen(false);
                }}
              >
                View Photo
              </button>
              <button
                className="block w-full px-4 py-2 text-left hover:bg-gray-50"
                onClick={() => openFilePicker()}
              >
                Change Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onChooseAvatar}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center md:items-start">
          <div className="text-xl font-semibold">{displayName}</div>

          <div className="text-sm text-gray-600">
            {nickname || `@${username}`}
          </div>

          {profile?.bio && (
            <p className="mt-2 max-w-prose text-center md:text-left">{profile.bio}</p>
          )}

          <div className="mt-3 flex items-center gap-6 text-sm">
            <div>
              <span className="font-semibold">{postsCount}</span> posts
            </div>
            <button
            className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-100"
              onClick={() => openFollowModal("followers")}
            >
              <span className="font-semibold">{followersCount}</span> followers
            </button>
            <button
              className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-100"
              onClick={() => openFollowModal("following")}
            >
              <span className="font-semibold">{followingCount}</span> following
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-md border px-4 py-2 hover:bg-gray-50"
              title="Edit Profile"
            >
              Edit Profile
            </button>
            <button
              onClick={() => setShareModal((prev) => ({ ...prev, open: true }))}
              className="flex items-center gap-2 rounded-md border px-4 py-2 hover:bg-gray-50"
              title="Share profile"
            >
              <Image src={shareIcon} alt="Share" width={18} height={18} />
              <span>Share profile</span>
            </button>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {loading && (
            <>
              <div className="aspect-square animate-pulse rounded bg-gray-100" />
              <div className="aspect-square animate-pulse rounded bg-gray-100" />
              <div className="aspect-square animate-pulse rounded bg-gray-100" />
            </>
          )}
          {!loading &&
            posts.map((p) => (
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
                      : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEA"
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

        {!loading && posts.length === 0 && (
          <p className="mt-10 text-center text-gray-500">You haven't posted yet.</p>
        )}
      </section>

      {showEdit && profile && (
        <ProfileEditModal title="" onClose={() => setShowEdit(false)}>
          <ProfileForm
            profile={profile}
            onUpdated={(np: Profile) => {
              setProfile(np);
              setShowEdit(false);
            }}
          />
        </ProfileEditModal>
      )}

      {activePost && <PostLightbox post={activePost} onClose={() => setActivePost(null)} />}

      {viewAvatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setViewAvatar(false)} />
          <div className="relative z-10 rounded-2xl bg-white p-4 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                avatarPreview
                  ? avatarPreview
                  : profile?.avatarUrl
                  ? assetUrl(profile.avatarUrl)
                  : fallbackAvatar
              }
              alt=""
              className="max-h-[80vh] max-w-[80vw] rounded-xl object-contain"
            />
            <button
              onClick={() => setViewAvatar(false)}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-sm shadow hover:bg-white"
            >
              X
            </button>
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
              Copy your profile link to share it with others.
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={profileShareUrl}
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <button
                onClick={copyShareUrl}
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
    </div>
  );
}
