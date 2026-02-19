"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Types ────────────────────────────────────────────────────
export interface FloatingIconsHeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  icons: {
    id: number;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    className: string;
  }[];
}

// ── Floating icon wrapper ────────────────────────────────────
function FloatingIcon({
  icon: Icon,
  className,
  delay,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  className: string;
  delay: number;
}) {
  return (
    <motion.div
      className={cn(
        "absolute z-0 rounded-xl border border-gray-200/60 bg-white/80 p-3 shadow-lg backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/80",
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
      }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: Math.random() * 2,
        }}
      >
        <Icon className="h-6 w-6 text-gray-700 dark:text-slate-300" />
      </motion.div>
    </motion.div>
  );
}

// ── Main hero component ──────────────────────────────────────
export default function FloatingIconsHero({
  title,
  subtitle,
  ctaText,
  ctaHref,
  secondaryCtaText,
  secondaryCtaHref,
  icons,
}: FloatingIconsHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const controls = useAnimation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-4 sm:px-6"
    >
      {/* Floating icons */}
      {mounted &&
        icons.map((item, i) => (
          <FloatingIcon
            key={item.id}
            icon={item.icon}
            className={item.className}
            delay={0.1 + i * 0.12}
          />
        ))}

      {/* Centre content */}
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <motion.h1
          className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {title}
        </motion.h1>

        <motion.p
          className="mt-4 text-base text-gray-500 dark:text-slate-400 sm:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {subtitle}
        </motion.p>

        <motion.div
          className="mt-8 flex items-center justify-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Button asChild size="lg" className="rounded-full px-8 text-base">
            <a href={ctaHref}>{ctaText}</a>
          </Button>
          {secondaryCtaText && secondaryCtaHref && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 text-base"
            >
              <a href={secondaryCtaHref}>{secondaryCtaText}</a>
            </Button>
          )}
        </motion.div>
      </div>
    </section>
  );
}
