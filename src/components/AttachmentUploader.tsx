"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

type Props = {
  templateId: string;
  currentName: string | null;
};

export function AttachmentUploader({ templateId, currentName }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  async function getSignedUrl(): Promise<string> {
    const res = await fetch(`/api/template/attachment/url?template_id=${templateId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Gagal ambil URL");
    return data.url as string;
  }

  async function openPreview() {
    setLoadingUrl(true);
    setError(null);
    try {
      const url = await getSignedUrl();
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingUrl(false);
    }
  }

  async function download() {
    setLoadingUrl(true);
    setError(null);
    try {
      const url = await getSignedUrl();
      const a = document.createElement("a");
      a.href = url;
      a.download = currentName ?? "attachment.pdf";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingUrl(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("template_id", templateId);
      const res = await fetch("/api/template/attachment", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload gagal");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    if (!confirm("Hapus attachment ini?")) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/template/attachment?template_id=${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal hapus");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (currentName) {
    return (
      <>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-sm">
            <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="truncate text-purple-900 font-medium flex-1">{currentName}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openPreview}
              disabled={loadingUrl || uploading}
              className="text-xs text-purple-700 hover:text-white hover:bg-purple-600 border border-purple-200 hover:border-purple-600 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {loadingUrl ? "Memuat..." : "Preview"}
            </button>
            <button
              onClick={download}
              disabled={loadingUrl || uploading}
              className="text-xs text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {uploading ? "Mengupload..." : "Ganti"}
            </button>
            <button
              onClick={remove}
              disabled={uploading}
              className="text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
              </svg>
              Hapus
            </button>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
        </div>

        <Modal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={currentName}
          maxWidth="xl"
        >
          <div className="h-[75vh] bg-slate-100">
            {previewUrl && (
              <iframe
                src={previewUrl}
                title={currentName}
                className="w-full h-full"
              />
            )}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-purple-700 font-medium hover:text-purple-900 px-3 py-1.5 rounded-lg border border-dashed border-purple-300 hover:bg-purple-50 hover:border-purple-400 inline-flex items-center gap-1.5"
      >
        {uploading ? (
          <>
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Mengupload...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload PDF Proposal
          </>
        )}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}
