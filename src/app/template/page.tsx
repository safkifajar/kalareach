import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { EmailTemplate } from "@/lib/types";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { TemplatePreviewButton } from "@/components/TemplatePreviewButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadTemplates(): Promise<EmailTemplate[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as EmailTemplate[];
}

export default async function TemplatePage() {
  let templates: EmailTemplate[] = [];
  let error: string | null = null;
  try {
    templates = await loadTemplates();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Template Email</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Variabel:{" "}
            <code className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-xs">{"{{nama_sekolah}}"}</code>{" "}
            <code className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-xs">{"{{npsn}}"}</code>{" "}
            <code className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-xs">{"{{kabupaten}}"}</code>
          </p>
        </div>
        <Link
          href="/template/baru"
          className="inline-flex items-center gap-2 gradient-purple rounded-lg px-4 py-2.5 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Template Baru
        </Link>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-5 hover:border-purple-300 hover:shadow-purple transition-all flex flex-col min-w-0 overflow-hidden">
            <div className="flex justify-between items-start gap-3 mb-3 min-w-0">
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-semibold text-slate-900 break-words">{t.nama}</h3>
                <p className="text-sm text-slate-600 mt-1 break-words" title={t.subject}>
                  Subject: {t.subject}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Diperbarui {new Date(t.updated_at).toLocaleDateString("id-ID")}
                </p>
              </div>
              <Link
                href={`/template/${t.id}/edit`}
                className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-white hover:bg-purple-600 border border-purple-200 hover:border-purple-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Link>
            </div>

            <div className="mb-3">
              <TemplatePreviewButton
                nama={t.nama}
                subject={t.subject}
                bodyHtml={t.body_html}
                attachmentName={t.attachment_name}
              />
            </div>

            <div className="mt-auto pt-3 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Lampiran
              </div>
              <AttachmentUploader templateId={t.id} currentName={t.attachment_name} />
            </div>
          </div>
        ))}
        {templates.length === 0 && !error && (
          <div className="md:col-span-2 text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <div className="w-14 h-14 rounded-full gradient-purple-soft flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">Belum ada template</p>
            <p className="text-sm text-slate-500 mt-1">
              Jalankan ulang <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code> untuk seed 2 template Kala Digital, atau klik <strong className="text-purple-700">+ Template Baru</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
