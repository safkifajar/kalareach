"use client";

import { useState } from "react";
import { Modal } from "./Modal";

type Props = {
  nama: string;
  subject: string;
  bodyHtml: string;
  attachmentName: string | null;
};

const SAMPLE_VARS = {
  nama_sekolah: "SMP YA BAKII 2 KESUGIHAN",
  npsn: "20300123",
  kabupaten: "Kab. Cilacap",
};

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function TemplatePreviewButton({ nama, subject, bodyHtml, attachmentName }: Props) {
  const [open, setOpen] = useState(false);
  const [showVars, setShowVars] = useState(true);

  const renderedSubject = showVars ? renderTemplate(subject, SAMPLE_VARS) : subject;
  const renderedBody = showVars ? renderTemplate(bodyHtml, SAMPLE_VARS) : bodyHtml;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-600 hover:text-purple-700 font-medium inline-flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview Email
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={nama} maxWidth="lg">
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setShowVars(true)}
                className={`px-2.5 py-1 rounded ${
                  showVars
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Dengan contoh data
              </button>
              <button
                onClick={() => setShowVars(false)}
                className={`px-2.5 py-1 rounded ${
                  !showVars
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Raw template
              </button>
            </div>
            {showVars && (
              <span className="text-xs text-slate-400">
                Contoh sekolah: <span className="text-slate-600">{SAMPLE_VARS.nama_sekolah}</span>
              </span>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 space-y-1.5">
              <div className="flex gap-2 text-xs">
                <span className="text-slate-500 font-medium w-16 flex-shrink-0">Dari:</span>
                <span className="text-slate-700">Safki — Kala Digital &lt;cskaladigital@gmail.com&gt;</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-slate-500 font-medium w-16 flex-shrink-0">Ke:</span>
                <span className="text-slate-700">
                  {showVars ? "kepala@smp-yabakii2.sch.id" : "{{email_sekolah}}"}
                </span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-slate-500 font-medium w-16 flex-shrink-0 text-xs pt-0.5">
                  Subject:
                </span>
                <span className="text-slate-900 font-semibold">{renderedSubject}</span>
              </div>
              {attachmentName && (
                <div className="flex gap-2 text-xs pt-1">
                  <span className="text-slate-500 font-medium w-16 flex-shrink-0">Lampiran:</span>
                  <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {attachmentName}
                  </span>
                </div>
              )}
            </div>
            <div
              className="bg-white px-6 py-5 email-body"
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
