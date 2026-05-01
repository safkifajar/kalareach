"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Template = {
  id: string;
  nama: string;
  subject: string;
  body_html: string;
  body_text: string | null;
};

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&quot;/g, '"')
    .trim();
}

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tmpl, setTmpl] = useState<Template | null>(null);
  const [nama, setNama] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"text" | "html">("text");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/template/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTmpl(data);
        setNama(data.nama);
        setSubject(data.subject);
        setBody(data.body_text ?? htmlToText(data.body_html));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body_html =
        mode === "html"
          ? body
          : body
              .split(/\n{2,}/)
              .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
              .join("\n");
      const res = await fetch(`/api/template/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          subject,
          body_html,
          body_text: mode === "text" ? body : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal simpan");
      router.push("/template");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function hapus() {
    if (!confirm(`Hapus template "${nama}"? Tidak bisa dibatalkan.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/template/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal hapus");
      router.push("/template");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Memuat template...</div>;
  }

  if (!tmpl) {
    return (
      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5">
        {error ?? "Template tidak ditemukan"}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/template"
          className="text-slate-400 hover:text-purple-600 inline-flex items-center"
          title="Kembali"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Edit Template</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Ubah isi template, lalu klik Simpan.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nama Template
          </label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
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
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Isi Email
            </label>
            <div className="flex gap-1 text-xs bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (mode === "html") setBody(htmlToText(body));
                  setMode("text");
                }}
                className={`px-2.5 py-1 rounded ${
                  mode === "text"
                    ? "bg-white text-purple-700 font-medium shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mode === "text") {
                    setBody(
                      body
                        .split(/\n{2,}/)
                        .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
                        .join("\n"),
                    );
                  }
                  setMode("html");
                }}
                className={`px-2.5 py-1 rounded ${
                  mode === "html"
                    ? "bg-white text-purple-700 font-medium shadow-sm"
                    : "text-slate-600"
                }`}
              >
                HTML
              </button>
            </div>
          </div>
          <textarea
            rows={16}
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

        <div className="flex gap-3 justify-between flex-wrap">
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || !nama || !subject || !body}
              className="gradient-purple disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-5 py-2.5 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <Link
              href="/template"
              className="bg-white border border-slate-300 rounded-lg px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              Batal
            </Link>
          </div>
          <button
            onClick={hapus}
            disabled={saving}
            className="text-red-600 border border-red-200 hover:bg-red-50 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            Hapus Template
          </button>
        </div>
      </div>
    </div>
  );
}
