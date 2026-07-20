"use client";

import { useEffect, useRef, useState } from "react";

declare global { interface Window { turnstile?: { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => void } } }

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const [error, setError] = useState("");
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!sitekey) return;
    if (!container.current) return;
    const unavailable = () => setError("Security verification could not load. Disable content blockers, then refresh and try again.");
    const render = () => {
      if (!window.turnstile || !container.current || rendered.current) { if (!window.turnstile) unavailable(); return; }
      rendered.current = true;
      window.turnstile.render(container.current, { sitekey, callback: (token) => { setError(""); onToken(token); }, "expired-callback": () => onToken(""), "error-callback": unavailable });
    };
    const existing = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');
    if (existing) {
      if (window.turnstile) render(); else { existing.addEventListener("load", render, { once: true }); existing.addEventListener("error", unavailable, { once: true }); }
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = render;
      script.onerror = unavailable;
      document.head.appendChild(script);
    }
  }, [onToken, sitekey]);

  const message = sitekey ? error : "Security verification is unavailable. Please refresh and try again.";
  return <div><div aria-label="Security verification" ref={container} />{message && <p className="mt-2 text-sm text-[#9a3f35]" role="alert">{message}</p>}</div>;
}
