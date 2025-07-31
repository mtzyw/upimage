"use client";

import LoginDialog from "@/components/auth/LoginDialog";
import { normalizeEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/client";
import { type AuthError, type User } from "@supabase/supabase-js";
import { redirect, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

type ExtendedUser = User & {
  role: "admin" | "user";
};

type AuthContextType = {
  user: ExtendedUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithGithub: () => Promise<{ error: AuthError | null }>;
  signInWithEmail: (
    email: string,
    captchaToken?: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // login dialog
  showLoginDialog: () => void;
  hideLoginDialog: () => void;
  isLoginDialogOpen: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const supabase = createClient();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role || "user";
    } catch (error) {
      console.error("Error in fetchUserRole:", error);
      return "user";
    }
  };

  const handleUser = async (user: User | null) => {
    try {
      if (user) {
        const role = await fetchUserRole(user.id);
        setUser({
          ...user,
          role: role as "admin" | "user",
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error in handleUser:", error);
      if (user) {
        setUser({
          ...user,
          role: "user",
        });
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      handleUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user || null);
    });

    const userSubscription = supabase
      .channel("public:users")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${user?.id}`,
        },
        async (payload) => {
          if (user) {
            setUser({
              ...user,
              role: payload.new.role,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      userSubscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
  };

  const signInWithGithub = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
  };

  const signInWithEmail = async (email: string, captchaToken?: string) => {
    return await supabase.auth.signInWithOtp({
      email: normalizeEmail(email),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        captchaToken,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    redirect("/");
  };

  const refreshUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await handleUser(user);
  };

  const showLoginDialog = () => setIsLoginDialogOpen(true);
  const hideLoginDialog = () => setIsLoginDialogOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithGithub,
        signInWithEmail,
        signOut,
        refreshUser,
        showLoginDialog,
        hideLoginDialog,
        isLoginDialogOpen,
      }}
    >
      {children}
      {process.env.NEXT_PUBLIC_LOGIN_MODE === "dialog" && (
        <LoginDialog
          open={isLoginDialogOpen}
          onOpenChange={setIsLoginDialogOpen}
        />
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
