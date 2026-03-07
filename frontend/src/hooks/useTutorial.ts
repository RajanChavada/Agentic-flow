"use client";

import { useState, useCallback, useEffect } from "react";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { useNeedsProfileOnboarding } from "@/store/useAuthStore";

const STORAGE_KEY = "neurovn-tutorial-completed";
const OPEN_EVENT = "neurovn:open-tutorial";

/** Dispatch from anywhere (e.g. HeaderBar Help button) to open the tutorial. */
export function openTutorial() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function useTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const needsOnboarding = useNeedsProfileOnboarding();

  // Auto-trigger on mount for first-time users with empty canvas
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY) === "true";
    if (completed || needsOnboarding) return;

    const timer = setTimeout(() => {
      const nodes = useWorkflowStore.getState().nodes;
      if (nodes.length === 0) {
        setIsOpen(true);
        setCurrentStep(0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [needsOnboarding]);

  // Listen for external open requests (Help button)
  useEffect(() => {
    const handler = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const open = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const next = useCallback(() => {
    setCurrentStep((s) => s + 1);
  }, []);

  const back = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  }, []);

  return { isOpen, currentStep, open, close, next, back, finish, skip };
}
