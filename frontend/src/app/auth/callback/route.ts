/**
 * OAuth / SSO callback route.
 *
 * After the user completes sign-in with an external provider (Google, GitHub,
 * SAML IdP, etc.), Supabase redirects back here with a `code` query param.
 * We exchange the code for a session, then redirect to the app root.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Read return path: prefer query param, fall back to cookie set before OAuth
  let next = searchParams.get("next");
  if (!next) {
    const cookieVal = request.cookies.get("auth_return_path")?.value;
    next = cookieVal ? decodeURIComponent(cookieVal) : "/canvases";
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);

    // Clear the return-path cookie now that we've consumed it
    response.cookies.set("auth_return_path", "", { path: "/", maxAge: 0 });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  // If code is missing or exchange failed, redirect home
  return NextResponse.redirect(`${origin}/`);
}
