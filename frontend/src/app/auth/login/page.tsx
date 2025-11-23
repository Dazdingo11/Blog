"use client";

import AuthForm from '../../../components/AuthForm';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-8 p-4 bg-white rounded shadow">
      <AuthForm variant="login" />
    </div>
  );
}