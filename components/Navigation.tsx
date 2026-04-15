"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  Cpu,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/personas", label: "Personas", icon: Users },
  { href: "/meetings", label: "Meetings", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              active
                ? "bg-[#3f3d6a] text-[#c5c5f5] font-semibold"
                : "text-[#b0afc8] hover:text-white hover:bg-[#2c2a44]"
            }`}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar (md+) ─────────────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-[#1e1c30] border-r border-[#3d3b5c] flex-col z-50">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#3d3b5c]">
          <div className="w-7 h-7 rounded-xl bg-[#6264a7] flex items-center justify-center">
            <Cpu size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-wide">AI Council</span>
        </div>
        <NavLinks />
        <div className="px-5 py-4 border-t border-[#3d3b5c]">
          <p className="text-xs text-[#78788a]">Local-first · No account</p>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-[#1e1c30] border-b border-[#3d3b5c] flex items-center px-4 z-50">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="p-1.5 text-[#b0afc8] hover:text-white rounded-xl hover:bg-[#2c2a44] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-5 h-5 rounded-lg bg-[#6264a7] flex items-center justify-center">
            <Cpu size={11} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white">AI Council</span>
        </div>
      </div>

      {/* ── Mobile drawer overlay ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      <aside
        className={`md:hidden fixed left-0 top-12 h-[calc(100%-3rem)] w-56 bg-[#1e1c30] border-r border-[#3d3b5c] flex flex-col z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavLinks onNavigate={() => setMobileOpen(false)} />
        <div className="px-5 py-4 border-t border-[#3d3b5c]">
          <p className="text-xs text-[#78788a]">Local-first · No account</p>
        </div>
      </aside>
    </>
  );
}
