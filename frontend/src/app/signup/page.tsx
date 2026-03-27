"use client";

import { useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import AuthModal from "@/components/AuthModal";
import { Sparkles } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") ?? "/canvases";

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init();
    useAuthStore.getState().openAuthModal({ mode: "signup", reason: "Join Neurovn to save your workflows and unlock Pro features." });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (user) router.replace(next);
  }, [router, next]);

  return (
    <div className="w-full rounded-3xl border border-border/60 bg-card/50 p-12 shadow-2xl backdrop-blur-sm text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 mx-auto mb-4">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <p className="text-muted-foreground font-medium">
        Opening secure authentication...
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="flex min-h-[90vh] items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-xl mb-6">
            NV
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Welcome to Neurovn
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            Create an account to start designing production AI workflows.
          </p>
        </div>

        <Suspense fallback={
          <div className="w-full rounded-3xl border border-border/60 bg-card p-12 text-center shadow-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="mt-4 text-muted-foreground font-medium">Preparing your workspace...</p>
          </div>
        }>
          <SignupForm />
        </Suspense>
        
        <div className="mt-12 flex items-center justify-center gap-8 text-sm font-medium">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link>
          <div className="h-1 w-1 rounded-full bg-border" />
          <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
          <div className="h-1 w-1 rounded-full bg-border" />
          <Link href="/auth/login" className="text-muted-foreground hover:text-primary transition-colors">Login</Link>
        </div>
      </div>
    </main>
  );
}

