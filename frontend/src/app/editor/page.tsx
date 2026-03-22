"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EditorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
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
      } catch (err) {
        router.replace("/editor/guest");
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
