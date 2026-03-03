/**
 * Auth store — thin Zustand wrapper around Supabase Auth.
 *
 * Tracks the current user / session and provides login / logout actions.
 * Components subscribe via the exported selector hooks.
 */

import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useProfileStore } from "@/store/useProfileStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;

  /** Brief message shown after sign out (e.g. "Signed out") */
  signOutMessage: string | null;

  /** true when the AuthModal should be visible */
  authModalOpen: boolean;
  /** optional message shown in the modal (e.g. "Sign in to save") */
  authModalReason: string | null;
  /** callback fired after a successful sign-in triggered by the modal */
  authModalCallback: (() => void) | null;
  /** initial mode when opening: signin or signup */
  authModalInitialMode: "signin" | "signup";
  /** persisted for OAuth return flow when callback is lost (e.g. "save") */
  postAuthAction: "save" | "saveAs" | "import" | null;

  // Actions
  setAuth: (user: User | null, session: Session | null) => void;
  openAuthModal: (opts?: { reason?: string; onSuccess?: () => void; mode?: "signin" | "signup"; postAuthAction?: "save" | "saveAs" | "import" }) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  clearSignOutMessage: () => void;
  /** Call once on mount to hydrate the session and listen for changes. */
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  signOutMessage: null,
  authModalOpen: false,
  authModalReason: null,
  authModalCallback: null,
  authModalInitialMode: "signin",
  postAuthAction: null,

  setAuth: (user, session) => set({ user, session, loading: false }),

  openAuthModal: (opts) =>
    set({
      authModalOpen: true,
      authModalReason: opts?.reason ?? null,
      authModalCallback: opts?.onSuccess ?? null,
      authModalInitialMode: opts?.mode ?? "signin",
      postAuthAction: opts?.postAuthAction ?? null,
    }),

  closeAuthModal: () =>
    set({
      authModalOpen: false,
      authModalReason: null,
      authModalCallback: null,
      postAuthAction: null,
    }),

  signOut: async () => {
    await supabase.auth.signOut();
    useProfileStore.getState().clear();
    set({ user: null, session: null, signOutMessage: "Signed out" });
  },

  clearSignOutMessage: () => set({ signOutMessage: null }),

  init: () => {
    // Hydrate current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        user: session?.user ?? null,
        session,
        loading: false,
      });
      if (session?.user) {
        useProfileStore.getState().hydrate(session.user.id, session.user.email ?? undefined);
      } else {
        useProfileStore.getState().clear();
      }
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const prev = get();
      set({ user: session?.user ?? null, session });

      // Hydrate profile when user signs in
      if (session?.user) {
        useProfileStore.getState().hydrate(session.user.id, session.user.email ?? undefined);
      } else {
        useProfileStore.getState().clear();
      }

      // If the modal triggered a sign-in and we now have a user, fire the callback or handle OAuth return
      if (session?.user) {
        if (prev.authModalCallback) {
          prev.authModalCallback();
          set({ authModalOpen: false, authModalReason: null, authModalCallback: null, postAuthAction: null });
        } else {
          // OAuth return: check localStorage for postAuthAction (callback was lost on redirect)
          const stored = typeof window !== "undefined" ? localStorage.getItem("postAuthAction") : null;
          if (stored === "save" || stored === "saveAs" || stored === "import") {
            localStorage.removeItem("postAuthAction");
            useWorkflowStore.getState().setShowNameWorkflowModal(true);
          }
        }
      }

      // When user signs out, close auth modal so we don't prompt re-sign-in
      if (!session?.user) {
        set({ authModalOpen: false, authModalReason: null, authModalCallback: null });
      }
    });

    // Return the unsubscribe function for cleanup
    return () => subscription.unsubscribe();
  },
}));

// ── Selector hooks ────────────────────────────────────────────
export const useUser = () => useAuthStore((s) => s.user);
export const useAuthLoading = () => useAuthStore((s) => s.loading);
export const useAuthModalOpen = () => useAuthStore((s) => s.authModalOpen);
export const useAuthModalReason = () => useAuthStore((s) => s.authModalReason);
