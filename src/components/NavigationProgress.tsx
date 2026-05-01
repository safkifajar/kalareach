"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip mount pertama supaya bar tidak nyala saat first load
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // Clear timers sebelumnya
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Mulai animasi
    setVisible(true);
    setProgress(15);

    // Naik bertahap supaya rasa "loading"
    timersRef.current.push(setTimeout(() => setProgress(40), 100));
    timersRef.current.push(setTimeout(() => setProgress(70), 250));
    timersRef.current.push(setTimeout(() => setProgress(90), 500));

    // Selesai setelah delay singkat (Next.js biasanya sudah selesai render saat ini)
    timersRef.current.push(
      setTimeout(() => {
        setProgress(100);
        // Sembunyikan setelah animasi 100% selesai
        timersRef.current.push(
          setTimeout(() => {
            setVisible(false);
            setProgress(0);
          }, 200),
        );
      }, 350),
    );

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [pathname, searchParams]);

  // Intercept klik link supaya bar nyala instant saat user klik
  // (sebelum URL benar-benar berubah)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      if (link.target === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Skip kalau navigasi ke pathname+search yang sama persis
      const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
      if (href === currentUrl) return;

      setVisible(true);
      setProgress(15);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname, searchParams]);

  // Intercept form submit (filter forms di halaman sekolah) supaya bar nyala
  useEffect(() => {
    function onSubmit() {
      setVisible(true);
      setProgress(15);
    }
    document.addEventListener("submit", onSubmit);
    return () => document.removeEventListener("submit", onSubmit);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
