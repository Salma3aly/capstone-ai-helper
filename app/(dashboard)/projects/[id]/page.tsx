'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectRoot() {
  const router = useRouter();
  useEffect(() => {
    router.replace('./idea');
  }, [router]);
  return null;
}
