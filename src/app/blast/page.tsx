import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { EmailBlast } from "@/lib/types";
import { BlastDeleteButton } from "@/components/BlastDeleteButton";

// Halaman ini selalu fetch data terbaru, jangan cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadBlasts(): Promise<EmailBlast[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("email_blasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as EmailBlast[];
}

const statusStyles: Record<string, string> = {
  done: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  draft: "bg-slate-100 text-slate-700",
};

export default async function BlastPage() {
  let blasts: EmailBlast[] = [];
  let error: string | null = null;
  try {
    blasts = await loadBlasts();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Email Blast</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Kirim email ke daftar sekolah yang sudah punya alamat email.
          </p>
        </div>
        <Link
          href="/blast/baru"
          className="inline-flex items-center gap-2 gradient-purple text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Blast Baru
        </Link>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nama Batch</th>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Status</th>
              <th className="text-right p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Target</th>
              <th className="text-right p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Terkirim</th>
              <th className="text-right p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Gagal</th>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Selesai</th>
              <th className="w-12 p-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {blasts.map((b) => (
              <tr
                key={b.id}
                className="border-b border-slate-100 last:border-0 hover:bg-purple-50/30 transition-colors group"
              >
                <td className="p-3.5 font-medium text-slate-900">
                  <Link href={`/blast/${b.id}`} className="hover:text-purple-700 hover:underline">
                    {b.nama_batch}
                  </Link>
                </td>
                <td className="p-3.5">
                  <span
                    className={`inline-block text-xs font-medium px-2.5 py-1 rounded-md ${
                      statusStyles[b.status] ?? statusStyles.draft
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="p-3.5 text-right text-slate-700">{b.total_target}</td>
                <td className="p-3.5 text-right font-medium text-green-700">{b.total_terkirim}</td>
                <td className="p-3.5 text-right font-medium text-red-700">{b.total_gagal}</td>
                <td className="p-3.5 text-xs text-slate-600">
                  {b.finished_at ? new Date(b.finished_at).toLocaleString("id-ID") : "-"}
                </td>
                <td className="p-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <BlastDeleteButton
                      blastId={b.id}
                      namaBatch={b.nama_batch}
                      status={b.status}
                    />
                    <Link
                      href={`/blast/${b.id}`}
                      className="text-slate-400 group-hover:text-purple-600 inline-flex p-1.5"
                      aria-label="Lihat detail"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {blasts.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full gradient-purple-soft flex items-center justify-center">
                      <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Belum ada blast</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Klik <strong className="text-purple-700">+ Blast Baru</strong> untuk mulai.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
