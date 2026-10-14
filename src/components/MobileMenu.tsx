"use client";

import { useState } from "react";

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
        className="font-mono text-xs tracking-wide"
      >
        {open ? "CLOSE" : "MENU"}
      </button>
      {open && (
        <div
          id="mobile-menu"
          className="bg-paper border-line absolute inset-x-0 top-full z-20 border-b px-4 py-5"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
          onSubmit={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
