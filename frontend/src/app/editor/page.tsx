"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EditorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/editor/guest");
        return;
      }

      const { data: canvases } = await supabase
        .from("canvases")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (canvases?.length) {
        router.replace(`/editor/${canvases[0].id}`);
      } else {
        router.replace("/canvases");
      }
    }

    redirect();
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </div>
  );
}
