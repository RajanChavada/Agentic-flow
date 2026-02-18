/**
 * Auth store — thin Zustand wrapper around Supabase Auth.
 *
 * Tracks the current user / session and provides login / logout actions.
 * Components subscribe via the exported selector hooks.
 */

import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;

  /** true when the AuthModal should be visible */
  authModalOpen: boolean;
  /** optional message shown in the modal (e.g. "Sign in to save") */
  authModalReason: string | null;
  /** callback fired after a successful sign-in triggered by the modal */
  authModalCallback: (() => void) | null;

  // Actions
  setAuth: (user: User | null, session: Session | null) => void;
  openAuthModal: (opts?: { reason?: string; onSuccess?: () => void }) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  /** Call once on mount to hydrate the session and listen for changes. */
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  authModalOpen: false,
  authModalReason: null,
  authModalCallback: null,

  setAuth: (user, session) => set({ user, session, loading: false }),

  openAuthModal: (opts) =>
    set({
      authModalOpen: true,
      authModalReason: opts?.reason ?? null,
      authModalCallback: opts?.onSuccess ?? null,
    }),

  closeAuthModal: () =>
    set({
      authModalOpen: false,
      authModalReason: null,
      authModalCallback: null,
    }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  init: () => {
    // Hydrate current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const prev = get();
      set({ user: session?.user ?? null, session });

      // If the modal triggered a sign-in and we now have a user, fire the callback
      if (session?.user && prev.authModalCallback) {
        prev.authModalCallback();
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
