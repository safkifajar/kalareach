import Link from "next/link";
import { PageSizeSelect } from "./PageSizeSelect";

export const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

type Props = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  baseHref: string;
  extraParams?: Record<string, string>;
  itemLabel?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  baseHref,
  extraParams = {},
  itemLabel = "data",
}: Props) {
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
    <div className="px-4 lg:px-5 py-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-xs text-slate-500">
          Menampilkan <strong className="text-slate-700">{from}</strong>-
          <strong className="text-slate-700">{to}</strong> dari{" "}
          <strong className="text-slate-700">{totalItems.toLocaleString("id-ID")}</strong> {itemLabel}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Per halaman:</span>
          <PageSizeSelect
            value={pageSize}
            options={ALLOWED_PAGE_SIZES}
            defaultSize={DEFAULT_PAGE_SIZE}
            baseHref={baseHref}
            extraParams={extraParams}
          />
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
  if (disabled) {
    return (
      <span
        aria-disabled
        className="min-w-[36px] h-9 px-3 inline-flex items-center justify-center rounded-lg text-sm text-slate-300 cursor-not-allowed"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={`min-w-[36px] h-9 px-3 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
        active
          ? "gradient-purple shadow-purple"
          : "text-slate-700 hover:bg-purple-50 hover:text-purple-700"
      }`}
    >
      {children}
    </Link>
  );
}
