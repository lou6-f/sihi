"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Auth utility hook wrapping NextAuth v4.
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";
  const user = session?.user ?? null;
  const isAdmin = user?.role === "ADMIN";

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push("/dashboard");
      router.refresh();
    },
    [router]
  );

  const logout = useCallback(async () => {
    await signOut({ callbackUrl: "/" });
  }, []);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated && !isLoading) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    login,
    logout,
    requireAuth,
  };
}
