"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/sekolah",
    label: "Sekolah",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    href: "/scraper",
    label: "Scraper",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: "/template",
    label: "Template",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/blast",
    label: "Blast",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Tutup drawer saat pindah halaman
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll saat drawer terbuka
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const sidebarContent = (
    <>
      <div className="p-5 lg:p-6 border-b border-slate-100 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg gradient-purple flex items-center justify-center shadow-purple">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">Kalareach</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Email Outreach
            </div>
          </div>
        </Link>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-slate-400 hover:text-slate-700 p-1.5"
          aria-label="Tutup menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "gradient-purple text-white shadow-purple"
                  : "text-slate-600 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* <div className="p-4 border-t border-slate-100">
        <div className="rounded-lg gradient-purple-soft p-3 border border-purple-100">
          <div className="flex items-center gap-2 text-purple-700 text-xs font-medium mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Free Tier Aktif
          </div>
          <div className="text-[11px] text-purple-600/80">
            Vercel + Supabase + Brevo
          </div>
        </div>
      </div> */}
    </>
  );

  return (
    <>
      {/* MOBILE TOPBAR — hanya muncul di < lg */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          className="text-slate-700 hover:bg-slate-100 rounded-lg p-2"
          aria-label="Buka menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md gradient-purple flex items-center justify-center shadow-purple">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-sm">Kalareach</span>
        </Link>
        <div className="w-9" />
      </header>

      {/* DESKTOP SIDEBAR — fix di kiri */}
      <aside className="hidden lg:flex w-64 h-screen bg-white border-r border-slate-200 flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* MOBILE DRAWER */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-40 w-72 h-screen bg-white border-r border-slate-200 flex flex-col shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
