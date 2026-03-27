/**
 * AuthModal — sign-in / sign-up modal with email and
 * OAuth (Google, GitHub) support.
 *
 * Shown when an unauthenticated user tries to Save, Export, or Import.
 * Uses Supabase Auth directly — no backend route required.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
  Github,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useAuthModalOpen, useAuthModalReason } from "@/store/useAuthStore";
import { useUIState, useWorkflowStore } from "@/store/useWorkflowStore";

// ── OAuth provider config ────────────────────────────────────
type OAuthProvider = "google" | "github";

interface ProviderButton {
  id: OAuthProvider;
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  hoverClass: string;
}

const OAUTH_PROVIDERS: ProviderButton[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      // Inline Google "G" SVG — Lucide doesn't include brand icons
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    bgClass: "bg-white border-gray-300 text-gray-700",
    hoverClass: "hover:bg-gray-50",
  },
  {
    id: "github",
    label: "GitHub",
    icon: <Github className="w-4 h-4" />,
    bgClass: "bg-gray-900 border-gray-900 text-white",
    hoverClass: "hover:bg-gray-800",
  },
];

export default function AuthModal() {
  const open = useAuthModalOpen();
  const reason = useAuthModalReason();
  const initialMode = useAuthStore((s) => s.authModalInitialMode);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const { theme } = useUIState();
  const isDark = theme === "dark";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (!open) return null;

  // ── Email / password ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setConfirmationSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Auth state change listener will fire callback and close modal; do not redirect
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // ── OAuth (Google, GitHub, Microsoft) ─────────────────────
  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null);
    setOauthLoading(provider);
    try {
      useWorkflowStore.getState().snapshotToLocalStorage();
      const postAuthAction = useAuthStore.getState().postAuthAction;
      if (postAuthAction) {
        localStorage.setItem("postAuthAction", postAuthAction);
      }
      // Store return path in a cookie so the server-side callback can read it
      // (query params are stripped by OAuth providers during redirect)
      const returnPath = window.location.pathname || "/editor/guest";
      document.cookie = `auth_return_path=${encodeURIComponent(returnPath)};path=/;max-age=600;SameSite=Lax`;
      const next = encodeURIComponent(returnPath);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (oauthError) throw oauthError;
      // Browser will redirect to provider's consent screen
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `${provider} login failed`);
      setOauthLoading(null);
    }
  };

  const reset = () => {
    setEmail("");
    setPassword("");
    setError(null);
    setConfirmationSent(false);
  };

  const switchMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    reset();
  };

  // ── Divider helper ────────────────────────────────────────
  const Divider = ({ text }: { text: string }) => (
    <div className="flex items-center gap-3 my-3">
      <div className={`flex-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
      <span className={`text-[10px] uppercase tracking-wide ${isDark ? "text-slate-500" : "text-gray-400"}`}>
        {text}
      </span>
      <div className={`flex-1 h-px ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className={`relative w-full max-w-sm rounded-[2rem] border shadow-2xl p-8 max-h-[95vh] overflow-y-auto ${isDark
          ? "border-slate-800 bg-slate-900/90 text-slate-100"
          : "border-border/60 bg-white/90 text-foreground"
          } backdrop-blur-xl transition-all duration-300 scale-100 items-center`}
      >
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className={`absolute top-6 right-6 p-2 rounded-xl transition ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-secondary text-muted-foreground"
            }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg mb-4">
            NV
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Sign In" : "Join Neurovn"}
          </h2>
          {reason && (
            <p className="mt-2 text-sm text-balance text-muted-foreground px-2">
              {reason}
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm mb-6 ${isDark
              ? "border-red-900/50 bg-red-900/20 text-red-400"
              : "border-red-100 bg-red-50 text-red-600"
              }`}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Confirmation sent */}
        {confirmationSent ? (
          <div className="text-center py-6">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className={`text-base font-semibold ${isDark ? "text-green-400" : "text-green-700"}`}>
              Check your inbox!
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent a confirmation link to your email.
            </p>
            <button
              onClick={() => { setMode("signin"); reset(); }}
              className="mt-6 text-sm font-bold text-primary hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* ── OAuth providers ────────────────────────── */}
            <div className="grid grid-cols-1 gap-3">
              {OAUTH_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleOAuth(p.id)}
                  disabled={oauthLoading !== null}
                  className={`flex items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50 ${isDark
                    ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-white"
                    : "border-border/60 bg-white hover:bg-secondary text-foreground"
                    }`}
                >
                  {oauthLoading === p.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    p.id === "google" ? p.icon : <Github className="w-5 h-5" />
                  )}
                  Continue with {p.label}
                </button>
              ))}
            </div>

            <Divider text="or with email" />

            {/* ── Email / password form ──────────────────── */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${isDark
                      ? "border-slate-700 bg-slate-800/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                      : "border-border/60 bg-secondary/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                      }`}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 ${isDark
                      ? "border-slate-700 bg-slate-800/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                      : "border-border/60 bg-secondary/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                      }`}
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 relative group overflow-hidden rounded-2xl bg-primary px-4 py-4 text-sm font-bold text-primary-foreground transition-all duration-300 hover:shadow-xl active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    mode === "signin" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
                  )}
                  <span>{mode === "signin" ? "Sign In" : "Start Designing"}</span>
                </div>
              </button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "signin" ? "New to Neurovn?" : "Already have an account?"}{" "}
                  <button 
                    type="button" 
                    onClick={switchMode} 
                    className="font-bold text-primary hover:underline transition-all"
                  >
                    {mode === "signin" ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
