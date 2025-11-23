"use client";

import { useRef, useState } from "react";
import api from "../lib/api";

interface Profile {
  id: number;
  displayName?: string; 
  avatarUrl?: string;
  bio?: string;
}
export default function ProfileForm({
  profile,
  onUpdated,
}: {
  profile: Profile | null;
  onUpdated: (p: Profile) => void;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pickFile = () => fileRef.current?.click();

  const onChooseAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/profile/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url: string = up.data?.url ?? up.data?.item?.url;
      if (url) {
        const patch = await api.put("/profile/me", {
          avatarUrl: url,
          displayName,
          bio,
        });
        onUpdated(
          patch.data.item?.profile ?? {
            ...(profile || {}),
            avatarUrl: url,
            displayName,
            bio,
          }
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put("/profile/me", { displayName, bio });
      onUpdated(
        res.data.item?.profile ?? { ...(profile || {}), displayName, bio }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} className="mt-6 rounded-lg border bg-white p-4">
      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium">Name and Surname</label>
        <input
          className="w-full rounded border px-3 py-2"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your full name"
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium">Avatar</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={pickFile}
            disabled={uploading}
            className="rounded border px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Select Photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onChooseAvatar}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium">Bio</label>
        <textarea
          className="w-full rounded border px-3 py-2"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell people about yourself"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
