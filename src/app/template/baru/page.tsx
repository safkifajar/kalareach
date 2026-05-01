"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TemplateBaruPage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(
    "Yth. Bapak/Ibu Kepala Sekolah {{nama_sekolah}},\n\nKami menawarkan jasa pembuatan website sekolah...\n\nSalam,\nTim Kalareach",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          subject,
          body_html: body.replace(/\n/g, "<br/>"),
          body_text: body,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal simpan");
      router.push("/template");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Template Baru</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Buat template email yang akan dikirim ke daftar sekolah.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nama Template
          </label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
            placeholder="Penawaran Website Sekolah"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Subject
          </label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
            placeholder="Penawaran Pembuatan Website {{nama_sekolah}}"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Isi Email
          </label>
          <textarea
            rows={12}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-mono"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Variabel:{" "}
            <code className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{"{{nama_sekolah}}"}</code>{" "}
            <code className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{"{{npsn}}"}</code>{" "}
            <code className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{"{{kabupaten}}"}</code>
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving || !nama || !subject}
            className="gradient-purple disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all"
          >
            {saving ? "Menyimpan..." : "Simpan Template"}
          </button>
          <button
            onClick={() => router.push("/template")}
            className="bg-white border border-slate-300 rounded-lg px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
