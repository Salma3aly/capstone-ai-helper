'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id?: string;
  name?: string;
  email?: string;
  grade?: string;
  phone?: string;
  university?: string;
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  signedIn: boolean;
  loading: boolean;
  signOut: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  signedIn: false,
  loading: true,
  signOut: () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUser = () => {
    const token = localStorage.getItem('capstone_token');
    const isIn = localStorage.getItem('capstone_signed_in') === 'true';
    if (token && isIn) {
      setSignedIn(true);
      try {
        const u = localStorage.getItem('capstone_user');
        if (u) setUser(JSON.parse(u));
      } catch {}
    } else if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/auth')) {
        router.replace('/');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, []);

  const refreshUser = () => loadUser();

  const signOut = () => {
    localStorage.removeItem('capstone_signed_in');
    localStorage.removeItem('capstone_token');
    localStorage.removeItem('capstone_user');
    localStorage.removeItem('capstone_avatar');
    router.push('/');
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, signedIn, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
