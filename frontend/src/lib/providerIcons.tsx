import React from "react";

/**
 * Brand-specific SVG paths for major AI providers.
 * Sourced from Simple Icons (MIT) or official brand assets.
 */
export const PROVIDER_ICONS: Record<string, string> = {
  OpenAI: "/icons/providers/openai.svg",
  Anthropic: "/icons/providers/anthropic.svg",
  Google: "/icons/providers/google.svg",
  Meta: "/icons/providers/meta.svg",
  Mistral: "/icons/providers/mistral.svg",
  DeepSeek: "/icons/providers/deepseek.svg",
  Cohere: "/icons/providers/cohere.svg",
};

export function ProviderIcon({
  provider,
  className = "w-4 h-4",
  size = 16,
}: {
  provider: string;
  className?: string;
  size?: number;
}) {
  const iconPath = PROVIDER_ICONS[provider];
  
  if (!iconPath) {
    // Fallback: Letter avatar style (colored circle with first letter)
    return (
      <div
        className={`flex items-center justify-center rounded-sm bg-secondary text-[10px] font-bold text-muted-foreground ${className}`}
        style={{ width: size, height: size }}
      >
        {provider?.[0]?.toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <img
      src={iconPath}
      alt={`${provider} logo`}
      width={size}
      height={size}
      className={`shrink-0 ${className} object-contain`}
      style={{ width: size, height: size }}
      onError={(e) => {
        // Fallback on image load error
        e.currentTarget.style.display = 'none';
        const parent = e.currentTarget.parentElement;
        if (parent) {
          const fallback = document.createElement('div');
          fallback.className = 'flex items-center justify-center rounded-sm bg-secondary text-[10px] font-bold text-muted-foreground';
          fallback.style.width = `${size}px`;
          fallback.style.height = `${size}px`;
          fallback.innerText = provider?.[0]?.toUpperCase() || '?';
          parent.appendChild(fallback);
        }
      }}
    />
  );
}
