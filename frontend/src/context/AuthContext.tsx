"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
  ReactNode,
} from 'react';
import api from '../lib/api';
import { createSocket } from '../lib/socket';
import type { Socket } from 'socket.io-client';

type User = { id: number; email: string; name: string; avatarUrl?: string | null } | null;

interface AuthContextType {
  user: User;
  login: (token: string, user: User) => void;
  logout: () => void;
  socket: Socket | null;
  ready: boolean;
  updateUser: (patch: Partial<NonNullable<User>>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  socket: null,
  ready: false,
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [ready, setReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
    setUser(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('accessToken');

    (async () => {
      try {
        if (savedToken) {
          localStorage.setItem('accessToken', savedToken);
          const me = await api.get('/profile/me');
          const profileAvatar = me.data?.item?.profile?.avatarUrl ?? null;
          const baseUser = me.data?.item?.user ?? me.data?.user ?? null;
          const currentUser: User = baseUser
            ? { ...baseUser, avatarUrl: profileAvatar }
            : null;
          if (currentUser) {
            localStorage.setItem('user', JSON.stringify(currentUser));
            setUser(currentUser);
            const s = createSocket(savedToken);
            socketRef.current = s;
            setSocket(s);
            setReady(true);
            return;
          }
        }
      } catch (e) {
        console.error('Auth validation failed', e);
        clearSession();
      }

      try {
        const res = await api.post('/auth/refresh');
        const accessToken: string | undefined = res.data?.accessToken;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          const me = await api.get('/profile/me');
          const profileAvatar = me.data?.item?.profile?.avatarUrl ?? null;
          const baseUser = me.data?.item?.user ?? me.data?.user ?? null;
          const currentUser: User = baseUser
            ? { ...baseUser, avatarUrl: profileAvatar }
            : null;
          if (currentUser) {
            localStorage.setItem('user', JSON.stringify(currentUser));
            setUser(currentUser);
            const s = createSocket(accessToken);
            socketRef.current = s;
            setSocket(s);
          }
        }
      } catch (e) {
        console.error('Auth refresh failed', e);
        clearSession();
      } finally {
        setReady(true);
      }
    })();
  }, [clearSession]);

  const login = (token: string, newUser: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
      if (newUser) {
        localStorage.setItem('user', JSON.stringify(newUser));
      }
    }
    setUser(newUser);
    try {
      const s = createSocket(token);
      socketRef.current = s;
      setSocket(s);
    } catch (e) {
      console.error('Socket init failed', e);
    }
  };

  const updateUser = (patch: Partial<NonNullable<User>>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...patch };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(merged));
      }
      return merged;
    });
  };

  const logout = () => {
    // Best-effort server logout to clear refresh cookie.
    api.post('/auth/logout').catch(() => {});
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, socket, ready, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
