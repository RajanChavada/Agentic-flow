"use client";

import { useUser, useNeedsProfileOnboarding } from "@/store/useAuthStore";
import ProfileOnboardingModal from "@/components/ProfileOnboardingModal";

/**
 * Renders ProfileOnboardingModal when a new user (no profile) needs to complete onboarding.
 * Must be in layout so it appears on any page after OAuth callback.
 * Pages call init() to hydrate auth; this gate just renders the modal when needed.
 */
export default function ProfileOnboardingGate() {
  const user = useUser();
  const needsOnboarding = useNeedsProfileOnboarding();

  if (!user || !needsOnboarding) return null;

  return <ProfileOnboardingModal open={true} onComplete={() => {}} />;
}
