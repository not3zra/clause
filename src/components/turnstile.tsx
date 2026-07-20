"use client";

import { useEffect, useRef } from "react";

declare global { interface Window { turnstile?: { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => void } } }

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey || !container.current) return;
    const render = () => window.turnstile?.render(container.current!, { sitekey, callback: onToken, "expired-callback": () => onToken("") });
    const existing = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');
    if (existing) render(); else { const script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.defer = true; script.onload = render; document.head.appendChild(script); }
  }, [onToken]);
  return <div aria-label="Security verification" ref={container} />;
}
