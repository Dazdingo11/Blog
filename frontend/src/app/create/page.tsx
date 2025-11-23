"use client";

import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import PostForm from '../../components/PostForm';

export default function CreatePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  if (!user) {
    return <p className="text-center mt-8">Redirecting...</p>;
  }

  return (
    <div className="mx-auto mt-8 max-w-5xl px-4">
      <PostForm />
    </div>
  );
}
