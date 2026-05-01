import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { EmailBlast, EmailTemplate } from "@/lib/types";
import { BlastDeleteButton } from "@/components/BlastDeleteButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Log = {
  id: string;
  email: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  open_count: number;
  clicked_at: string | null;
  click_count: number;
  school: { nama: string; npsn: string | null; kabupaten: string | null } | null;
};

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

async function loadDetail(
  id: string,
  page: number,
  pageSize: number,
  statusFilter: string | undefined,
) {
  const supabase = getSupabaseAdmin();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let logsQuery = supabase
    .from("email_blast_logs")
    .select("*, school:schools(nama, npsn, kabupaten)", { count: "exact" })
    .eq("blast_id", id)
    .order("sent_at", { ascending: true })
    .range(from, to);
  if (statusFilter === "sent") logsQuery = logsQuery.eq("status", "sent");
  if (statusFilter === "failed") logsQuery = logsQuery.eq("status", "failed");

  const [blastRes, logsRes, openedCountRes, clickedCountRes] = await Promise.all([
    supabase
      .from("email_blasts")
      .select("*, template:email_templates(id, nama, subject, attachment_name)")
      .eq("id", id)
      .single(),
    logsQuery,
    supabase
      .from("email_blast_logs")
      .select("id", { count: "exact", head: true })
      .eq("blast_id", id)
      .not("opened_at", "is", null),
    supabase
      .from("email_blast_logs")
      .select("id", { count: "exact", head: true })
      .eq("blast_id", id)
      .not("clicked_at", "is", null),
  ]);

  if (blastRes.error || !blastRes.data) return null;

  return {
    blast: blastRes.data as EmailBlast & {
      template: (Pick<EmailTemplate, "id" | "nama" | "subject"> & { attachment_name: string | null }) | null;
    },
    logs: (logsRes.data ?? []) as Log[],
    totalLogs: logsRes.count ?? 0,
    totalOpened: openedCountRes.count ?? 0,
    totalClicked: clickedCountRes.count ?? 0,
  };
}

const statusBadge: Record<string, string> = {
  done: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  draft: "bg-slate-100 text-slate-700",
};

const logStatusBadge: Record<string, string> = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function formatDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "-";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "-";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} detik`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min} menit ${remSec} detik`;
}

export default async function BlastDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; status?: string; size?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const requestedSize = Number(sp.size) || DEFAULT_PAGE_SIZE;
  const pageSize = (ALLOWED_PAGE_SIZES as readonly number[]).includes(requestedSize)
    ? requestedSize
    : DEFAULT_PAGE_SIZE;
  const statusFilter = sp.status === "sent" || sp.status === "failed" ? sp.status : undefined;

  const detail = await loadDetail(id, page, pageSize, statusFilter);
  if (!detail) notFound();

  const { blast, logs, totalLogs, totalOpened, totalClicked } = detail;
  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));
  const successRate = blast.total_target > 0
    ? Math.round((blast.total_terkirim / blast.total_target) * 100)
    : 0;
  const openRate = blast.total_terkirim > 0
    ? Math.round((totalOpened / blast.total_terkirim) * 100)
    : 0;
  const clickRate = blast.total_terkirim > 0
    ? Math.round((totalClicked / blast.total_terkirim) * 100)
    : 0;

  // Sender email dari env (sama yang dipakai oleh Brevo wrapper)
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 flex-wrap">
        <Link
          href="/blast"
          className="text-slate-400 hover:text-purple-600 inline-flex items-center mt-1.5"
          title="Kembali"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{blast.nama_batch}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                statusBadge[blast.status] ?? statusBadge.draft
              }`}
            >
              {blast.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dibuat {formatDate(blast.created_at)}
          </p>
        </div>
        <BlastDeleteButton
          blastId={blast.id}
          namaBatch={blast.nama_batch}
          status={blast.status}
          variant="full"
        />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatBox
          label="Target"
          value={blast.total_target}
          color="text-slate-700"
        />
        <StatBox
          label="Terkirim"
          value={blast.total_terkirim}
          color="text-green-700"
          sub={`${successRate}% sukses`}
        />
        <StatBox
          label="Gagal"
          value={blast.total_gagal}
          color="text-red-700"
        />
        <StatBox
          label="Dibuka"
          value={totalOpened}
          color="text-blue-700"
          sub={blast.total_terkirim > 0 ? `${openRate}% open rate` : undefined}
        />
        <StatBox
          label="Diklik"
          value={totalClicked}
          color="text-fuchsia-700"
          sub={blast.total_terkirim > 0 ? `${clickRate}% click rate` : undefined}
        />
        <StatBox
          label="Durasi"
          value={formatDuration(blast.started_at, blast.finished_at)}
          color="text-purple-700"
          isText
        />
      </div>

      {/* 2-COLUMN LAYOUT */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Details + Timeline + Template */}
        <div className="lg:col-span-1 space-y-6">
          {/* DETAILS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Details</h2>
            <div className="space-y-3.5 text-sm">
              <DetailRow label="Pengirim">
                <span className="text-slate-900">{senderEmail}</span>
              </DetailRow>
              <DetailRow label="Total Penerima">
                <span className="font-semibold text-slate-900">
                  {blast.total_target.toLocaleString("id-ID")}
                </span>{" "}
                <span className="text-xs text-slate-500">sekolah</span>
              </DetailRow>
              <DetailRow label="Status">
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                    statusBadge[blast.status] ?? statusBadge.draft
                  }`}
                >
                  {blast.status}
                </span>
              </DetailRow>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Timeline</h2>
            <ol className="relative space-y-4 text-sm border-l-2 border-slate-100 ml-2 pl-5">
              <TimelineItem
                color="slate"
                label="Dibuat"
                value={formatDate(blast.created_at)}
              />
              <TimelineItem
                color="blue"
                label="Mulai dikirim"
                value={formatDate(blast.started_at)}
              />
              <TimelineItem
                color={blast.status === "failed" ? "red" : "green"}
                label="Selesai"
                value={formatDate(blast.finished_at)}
                last
              />
            </ol>
          </div>

          {/* TEMPLATE */}
          {blast.template && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-5">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h2 className="font-semibold text-slate-900">Template</h2>
                <Link
                  href={`/template/${blast.template.id}/edit`}
                  className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                >
                  Lihat template →
                </Link>
              </div>
              <div className="space-y-3.5 text-sm">
                <DetailRow label="Nama">
                  <span className="font-medium text-slate-900">{blast.template.nama}</span>
                </DetailRow>
                <DetailRow label="Subject">
                  <span className="text-slate-900 break-words">{blast.template.subject}</span>
                </DetailRow>
                {blast.template.attachment_name && (
                  <DetailRow label="Lampiran">
                    <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-xs break-all">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {blast.template.attachment_name}
                    </span>
                  </DetailRow>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Detail Pengiriman */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Detail Pengiriman</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalLogs.toLocaleString("id-ID")} log
              {statusFilter ? ` (filter: ${statusFilter})` : ""}
              {totalPages > 1 && ` · halaman ${page} dari ${totalPages}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {(() => {
              const sizeParam = pageSize !== DEFAULT_PAGE_SIZE ? `?size=${pageSize}` : "";
              const sizeAmp = pageSize !== DEFAULT_PAGE_SIZE ? `&size=${pageSize}` : "";
              return (
                <>
                  <FilterPill
                    href={`/blast/${id}${sizeParam}`}
                    active={!statusFilter}
                    label={`Semua (${blast.total_target})`}
                  />
                  <FilterPill
                    href={`/blast/${id}?status=sent${sizeAmp}`}
                    active={statusFilter === "sent"}
                    label={`Sukses (${blast.total_terkirim})`}
                    color="green"
                  />
                  <FilterPill
                    href={`/blast/${id}?status=failed${sizeAmp}`}
                    active={statusFilter === "failed"}
                    label={`Gagal (${blast.total_gagal})`}
                    color="red"
                  />
                </>
              );
            })()}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Sekolah</th>
                <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Email</th>
                <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Status</th>
                <th className="text-center p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Buka</th>
                <th className="text-center p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Klik</th>
                <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Waktu</th>
                <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-purple-50/30">
                  <td className="p-3.5">
                    <div className="font-medium text-slate-900 text-sm">
                      {l.school?.nama ?? <span className="text-slate-400 italic">(sekolah dihapus)</span>}
                    </div>
                    {l.school && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="font-mono">{l.school.npsn ?? "-"}</span>
                        {l.school.kabupaten && <> · {l.school.kabupaten}</>}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-purple-600 text-xs">{l.email}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                        logStatusBadge[l.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    {l.opened_at ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
                        title={`Pertama dibuka ${formatDate(l.opened_at)}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {l.open_count > 1 ? `${l.open_count}×` : "✓"}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {l.clicked_at ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-fuchsia-700 bg-fuchsia-50 px-2 py-0.5 rounded"
                        title={`Pertama diklik ${formatDate(l.clicked_at)}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {l.click_count > 1 ? `${l.click_count}×` : "✓"}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3.5 text-xs text-slate-600">
                    {formatDate(l.sent_at)}
                  </td>
                  <td className="p-3.5 text-xs text-red-600 max-w-xs">
                    {l.error_message ? (
                      <span className="break-words" title={l.error_message}>
                        {l.error_message.length > 80
                          ? `${l.error_message.slice(0, 80)}...`
                          : l.error_message}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <p>{statusFilter ? "Tidak ada log dengan filter ini." : "Belum ada log pengiriman."}</p>
                    {!statusFilter && (
                      <p className="text-xs mt-1">
                        {blast.status === "draft"
                          ? "Blast ini masih draft (mungkin dry-run)."
                          : "Tunggu sampai blast selesai."}
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalLogs > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalLogs}
            pageSize={pageSize}
            baseHref={`/blast/${id}`}
            extraParams={statusFilter ? { status: statusFilter } : {}}
          />
        )}
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
  color = "purple",
}: {
  href: string;
  active: boolean;
  label: string;
  color?: "purple" | "green" | "red";
}) {
  const colorMap = {
    purple: "bg-purple-100 text-purple-700 border-purple-300",
    green: "bg-green-100 text-green-700 border-green-300",
    red: "bg-red-100 text-red-700 border-red-300",
  };
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
        active
          ? colorMap[color]
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  baseHref,
  extraParams,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  baseHref: string;
  extraParams: Record<string, string>;
}) {
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  function buildHref(opts: { page?: number; size?: number }): string {
    const params = new URLSearchParams(extraParams);
    const targetSize = opts.size ?? pageSize;
    const targetPage = opts.page ?? currentPage;
    if (targetPage > 1) params.set("page", String(targetPage));
    if (targetSize !== DEFAULT_PAGE_SIZE) params.set("size", String(targetSize));
    const qs = params.toString();
    return `${baseHref}${qs ? `?${qs}` : ""}`;
  }

  // Bangun list nomor halaman dengan ellipsis
  const pages: (number | "...")[] = [];
  const window = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - window && i <= currentPage + window)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-xs text-slate-500">
          Menampilkan <strong className="text-slate-700">{from}</strong>-
          <strong className="text-slate-700">{to}</strong> dari{" "}
          <strong className="text-slate-700">{totalItems.toLocaleString("id-ID")}</strong> log
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Per halaman:</span>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {ALLOWED_PAGE_SIZES.map((size) => (
              <Link
                key={size}
                href={buildHref({ page: 1, size })}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  size === pageSize
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {size}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PaginationButton
            href={buildHref({ page: currentPage - 1 })}
            disabled={currentPage <= 1}
            ariaLabel="Halaman sebelumnya"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </PaginationButton>
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`e-${i}`} className="px-2 text-slate-400 text-sm">
                …
              </span>
            ) : (
              <PaginationButton
                key={p}
                href={buildHref({ page: p })}
                active={p === currentPage}
              >
                {p}
              </PaginationButton>
            ),
          )}
          <PaginationButton
            href={buildHref({ page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
            ariaLabel="Halaman berikutnya"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </PaginationButton>
        </div>
      )}
    </div>
  );
}

function PaginationButton({
  href,
  children,
  active,
  disabled,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const className = `inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
    active
      ? "gradient-purple text-white shadow-purple"
      : disabled
      ? "text-slate-300 cursor-not-allowed"
      : "text-slate-700 hover:bg-slate-100"
  }`;
  if (disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={ariaLabel}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

function StatBox({
  label,
  value,
  color,
  sub,
  isText,
}: {
  label: string;
  value: number | string;
  color: string;
  sub?: string;
  isText?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </div>
      <div className={`mt-1.5 font-bold ${color} ${isText ? "text-base" : "text-2xl"}`}>
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 mb-0.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  color,
  last,
}: {
  label: string;
  value: string;
  color: "slate" | "blue" | "green" | "red";
  last?: boolean;
}) {
  const colorMap = {
    slate: "bg-slate-300 ring-slate-100",
    blue: "bg-blue-500 ring-blue-100",
    green: "bg-green-500 ring-green-100",
    red: "bg-red-500 ring-red-100",
  };
  return (
    <li className="relative">
      <span
        className={`absolute -left-[28px] top-1 w-3.5 h-3.5 rounded-full ring-4 ${colorMap[color]}`}
        aria-hidden
      />
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`text-sm mt-0.5 ${value === "-" ? "text-slate-400 italic" : "text-slate-900"}`}>
        {value}
      </div>
      {last && null}
    </li>
  );
}
