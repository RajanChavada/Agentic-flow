"use client";

import { useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import AuthModal from "@/components/AuthModal";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") ?? "/canvases";

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init();
    useAuthStore.getState().openAuthModal({ mode: "signup", reason: "Create an account to fork this workflow." });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (user) router.replace(next);
  }, [router, next]);

  return (
    <>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign up</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create an account to fork shared workflows and save them to your canvas.</p>
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href={next} className="underline">Back to shared view</Link>
          <Link href="/" className="underline">Home</Link>
        </div>
      </div>
      <AuthModal />
    </>
  );
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
      <Suspense fallback={
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground text-center">Loading...</p>
        </div>
      }>
        <SignupForm />
      </Suspense>
    </main>
  );
}

