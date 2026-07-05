'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  name?: string;
  email?: string;
}

interface AuthContextValue {
  user: User | null;
  signedIn: boolean;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  signedIn: false,
  loading: true,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('capstone_token');
    const isIn = localStorage.getItem('capstone_signed_in') === 'true';
    if (token && isIn) {
      setSignedIn(true);
      try {
        const u = localStorage.getItem('capstone_user');
        if (u) setUser(JSON.parse(u));
      } catch {}
    } else {
      router.replace('/');
    }
    setLoading(false);
  }, [router]);

  const signOut = () => {
    localStorage.removeItem('capstone_signed_in');
    localStorage.removeItem('capstone_token');
    localStorage.removeItem('capstone_user');
    router.push('/');
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, signedIn, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
