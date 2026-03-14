'use client';

import { useAuth } from '../../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();
  const router = useRouter();

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  const isOfficer = selectedPlayer?.memberLevel !== undefined &&
    (selectedPlayer.memberLevel >= 3 || selectedPlayer.isAdmin === true);

  useEffect(() => {
    if (!loading && session && selectedPlayer && !isOfficer) {
      router.push('/forbidden');
    }
  }, [loading, session, selectedPlayer, isOfficer, router]);

  if (loading) {
    return null;
  }

  if (!isOfficer) {
    return null;
  }

  return <>{children}</>;
}
