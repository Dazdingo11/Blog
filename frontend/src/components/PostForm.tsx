"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";
import { assetUrl } from "../lib/url";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";

interface Post {
  id: number;
  title: string;
  body?: string;
  content?: string;
  image_url?: string;
}

interface Props {
  post?: Post;
  onSuccess?: () => void;
}

export default function PostForm({ post, onSuccess }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(post?.title || "");
  const [body, setBody] = useState(post?.body || post?.content || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Default preview to existing image when editing.
    if (post?.image_url) {
      setPreviewUrl(assetUrl(post.image_url));
    }
  }, [post?.image_url]);

  useEffect(() => {
    if (!imageFile) return;
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const resetErrors = () => setError(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("body", body);
      if (imageFile) {
        formData.append("image", imageFile);
      }
      if (post) {
        await api.put(`/posts/${post.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (onSuccess) onSuccess();
      } else {
        await api.post("/posts", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const removeSelectedImage = () => {
    setImageFile(null);
    setPreviewUrl(post?.image_url ? assetUrl(post.image_url) : null);
  };

  const titlePlaceholder = "Give your post a headline";
  const bodyPlaceholder = "Describe the moment...";
  const cardBody = body || "Your description will appear here as you type.";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {post ? "Edit Post" : "Create Post"}
          </h2>
          <span className="text-xs text-gray-500">{title.length}/100</span>
        </div>

        <input
          type="text"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={resetErrors}
          placeholder={titlePlaceholder}
          className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          required
        />
        <div className="flex items-start justify-between">
          <label className="text-xs font-semibold text-gray-600">
            Photo
          </label>
          {previewUrl && (
            <button
              type="button"
              onClick={removeSelectedImage}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
        <label
          className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) {
              setImageFile(file);
            }
          }}
        >
          <span>Click to upload or drag and drop</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files ? e.target.files[0] : null;
              setImageFile(file);
            }}
          />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">Description</span>
          <span className="text-xs text-gray-500">{body.length}/500</span>
        </div>
        <textarea
          value={body}
          maxLength={500}
          onChange={(e) => setBody(e.target.value)}
          onFocus={resetErrors}
          placeholder={bodyPlaceholder}
          className="h-32 w-full resize-none rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          required
        />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : post ? "Save Changes" : "Create Post"}
          </button>
        </div>
      </form>

      <div className="sticky top-4 hidden rounded-xl border bg-white shadow-sm lg:block">
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <Avatar
              src={(user as any)?.avatarUrl || null}
              alt={user?.name || "You"}
              size={38}
            />
            <div className="leading-tight">
              <div className="font-semibold text-sm">{user?.name || "You"}</div>
              <div className="text-xs text-gray-500">Preview</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-gray-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="h-64 w-full object-cover"
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-sm text-gray-500">
                Photo preview
              </div>
            )}
            <div className="space-y-2 p-3">
              <div className="text-base font-semibold">
                {title || "Post title"}
              </div>
              <div className="text-sm text-gray-700">{cardBody}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
