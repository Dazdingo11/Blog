"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Image from "next/image";
import messageIcon from "../assets/message.svg";
import homeIcon from "../assets/home.svg";
import searchIcon from "../assets/search.svg";
import postIcon from "../assets/post.svg";
import { useMessages } from "../context/MessagesContext";
import Avatar from "./Avatar";

export default function Navbar() {
  const { user, logout, ready } = useAuth();
  const { totalUnread } = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthed = ready && !!user;

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
      logout?.();
    } finally {
      router.push("/auth/login");
    }
  };

  const IconLink = ({
    href,
    icon,
    label,
  }: {
    href: string;
    icon: any;
    label: string;
  }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition hover:bg-gray-100 ${
          active ? "text-blue-700" : "text-gray-700"
        }`}
        aria-label={label}
        title={label}
      >
        <Image src={icon} alt={label} width={22} height={22} />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  };

  const TextLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-2 py-1 text-sm ${
          active ? "font-semibold text-blue-700" : "text-gray-700"
        } hover:text-blue-700`}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav className="w-full border-b bg-white">
      <div className="mx-auto flex h-12 max-w-5xl items-center px-4">
        <Link href="/" className="mr-6 text-lg font-bold">
          Tech Blog
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <IconLink href="/" icon={homeIcon} label="Home" />
          <IconLink href="/search" icon={searchIcon} label="Search" />
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {!isAuthed ? (
            <>
              <TextLink href="/auth/login">Login</TextLink>
              <TextLink href="/auth/register">Register</TextLink>
            </>
          ) : (
            <>
              <IconLink href="/create" icon={postIcon} label="Post" />
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                title="Profile"
              >
                <Avatar
                  src={user?.avatarUrl || null}
                  alt={user?.name || "Profile"}
                  size={28}
                />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <Link
                href="/messages"
                className="relative flex items-center gap-2 rounded-full px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                title="Messages"
                aria-label="Messages"
              >
                <Image src={messageIcon} alt="Messages" width={22} height={22} />
                <span className="hidden sm:inline">Messages</span>
                {totalUnread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                aria-label="Logout"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
