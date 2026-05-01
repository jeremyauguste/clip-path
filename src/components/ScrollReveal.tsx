"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const RevealContext = createContext(false);

export function RevealGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <RevealContext.Provider value={visible}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </RevealContext.Provider>
  );
}

export function RevealItem({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const visible = useContext(RevealContext);
  return (
    <div
      className={`transition-all duration-[550ms] ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      } ${className ?? ""}`}
      style={{ transitionDelay: `${visible ? delay : 0}ms` }}
    >
      {children}
    </div>
  );
}
