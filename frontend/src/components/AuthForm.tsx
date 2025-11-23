"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Props {
  variant: "login" | "register";
}

export default function AuthForm({ variant }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const { login: setLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (variant === "login") {
        const res = await api.post("/auth/login", {
          email: identifier,
          password,
        });
        // API responds with { item, accessToken }.
        const { item, accessToken } = res.data;
        setLogin(accessToken, item);
        router.push("/");
      } else {
        if (password !== passwordConfirm) {
          setError("Passwords must match");
          return;
        }
        const res = await api.post("/auth/register", {
          username,
          fullName,
          dob,
          email: identifier,
          password,
          passwordConfirm,
        });
        const { item, accessToken } = res.data;
        setLogin(accessToken, item);
        router.push("/");
      }
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        "An error occurred";
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">
        {variant === "login" ? "Login" : "Register"}
      </h2>
      {variant === "register" ? (
        <>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full rounded border p-2"
            required
          />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Name and surname"
            className="w-full rounded border p-2"
          />
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            placeholder="Date of birth"
            className="w-full rounded border p-2"
          />
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email"
            className="w-full rounded border p-2"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded border p-2"
            required
          />
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Re-enter password"
            className="w-full rounded border p-2"
            required
          />
        </>
      ) : (
        <>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or username"
            className="w-full rounded border p-2"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded border p-2"
            required
          />
        </>
      )}
      {error && <p className="text-red-500">{error}</p>}
      <button
        type="submit"
        className="w-full rounded bg-blue-600 py-2 text-white"
      >
        {variant === "login" ? "Login" : "Register"}
      </button>
    </form>
  );
}
