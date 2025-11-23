"use client";

import { useState } from "react";
import defaultAvatar from "../assets/avatardefault.svg";
import { assetUrl } from "../lib/url";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  draggable?: boolean;
}

export default function Avatar({
  src,
  alt,
  size = 40,
  className = "",
  onClick,
  draggable = false,
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const fallbackSrc =
    (defaultAvatar as { src?: string }).src || (defaultAvatar as unknown as string);

  const resolveSrc = (value?: string | null) => {
    if (!value) return null;
    if (
      /^https?:\/\//i.test(value) ||
      value.startsWith("data:") ||
      value.startsWith("blob:")
    ) {
      return value;
    }
    if (value.startsWith("/uploads")) {
      return assetUrl(value);
    }
    if (value.startsWith("/")) {
      return value;
    }
    return assetUrl(value);
  };

  const resolvedSrc = !errored ? resolveSrc(src) || fallbackSrc : fallbackSrc;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      style={{ width: size, height: size }}
      className={`rounded-full border border-gray-200 bg-gray-100 object-cover ${className}`}
      onError={() => setErrored(true)}
      onClick={onClick}
      draggable={draggable}
    />
  );
}
