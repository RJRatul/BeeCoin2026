"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (requireAuth && !user) {
      router.replace("/login");
    } else if (!requireAuth && user && (pathname === "/login" || pathname === "/register")) {
      router.replace("/trade");
    }
  }, [user, loading, requireAuth, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (requireAuth && !user) return null;
  if (!requireAuth && user && (pathname === "/login" || pathname === "/register")) return null;

  return <>{children}</>;
}