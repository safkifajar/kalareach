"use client";

import { useEffect, useState } from "react";

/**
 * Tombol submit dengan loading state.
 * Nyala saat form di-submit, mati otomatis saat halaman selesai navigasi.
 */
export function FilterSubmitButton() {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Form submit listener — nyala saat user klik
    function onSubmit() {
      setSubmitting(true);
    }
    document.addEventListener("submit", onSubmit);

    // Saat halaman baru selesai render, reset state
    return () => {
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return (
    <button
      type="submit"
      disabled={submitting}
      className="gradient-purple disabled:opacity-70 rounded-lg px-5 py-2 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all inline-flex items-center gap-2 min-w-[100px] justify-center"
    >
      {submitting ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Memuat...
        </>
      ) : (
        "Filter"
      )}
    </button>
  );
}
