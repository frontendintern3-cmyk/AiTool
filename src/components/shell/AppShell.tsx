"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | undefined>(undefined);

  return (
    <div className="flex flex-col h-full min-h-screen w-full bg-slate-50/70 font-sans text-slate-900">
      <Header
        isSidebarOpen={isMobileOpen}
        onToggleSidebar={() => setIsMobileOpen((prev) => !prev)}
      />

      <div className="flex flex-1 min-h-0 w-full">
        {/* Desktop rail + flyout panels (Sidebar renders its own hidden md:flex tier) */}
        <div className="hidden md:block shrink-0">
          <Sidebar
            isOpen={false}
            handleClick={() => {}}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isCollapsed
          />
        </div>

        {/* Mobile drawer overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="relative z-10">
              <Sidebar
                isOpen={isMobileOpen}
                handleClick={() => setIsMobileOpen(false)}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="flex-1 bg-black/40"
              aria-label="Close menu"
            >
              <span className="sr-only">Close menu</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 left-[19rem] sm:left-[21rem] p-2 rounded-full bg-white shadow-lg text-slate-600"
              aria-label="Close menu"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
