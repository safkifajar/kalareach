import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getStats() {
  try {
    const supabase = getSupabaseAdmin();
    const [schools, withEmail, templates, blasts] = await Promise.all([
      supabase.from("schools").select("id", { count: "exact", head: true }),
      supabase
        .from("schools")
        .select("id", { count: "exact", head: true })
        .not("email", "is", null),
      supabase.from("email_templates").select("id", { count: "exact", head: true }),
      supabase.from("email_blasts").select("id", { count: "exact", head: true }),
    ]);
    return {
      ok: true as const,
      total: schools.count ?? 0,
      withEmail: withEmail.count ?? 0,
      templates: templates.count ?? 0,
      blasts: blasts.count ?? 0,
    };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

const statIcons = {
  total: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
    </svg>
  ),
  email: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  template: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  blast: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

export default async function Home() {
  const stats = await getStats();

  if (!stats.ok) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h1 className="text-lg font-semibold text-amber-900 mb-1">Setup belum lengkap</h1>
            <p className="text-sm text-amber-800 mb-3">{stats.error}</p>
            <p className="text-sm text-amber-800">
              Lihat <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">README.md</code> untuk panduan setup Supabase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Sekolah", value: stats.total, href: "/sekolah", icon: statIcons.total, color: "from-purple-500 to-purple-700" },
    { label: "Punya Email", value: stats.withEmail, href: "/sekolah?hasEmail=1", icon: statIcons.email, color: "from-pink-500 to-purple-600" },
    { label: "Template Email", value: stats.templates, href: "/template", icon: statIcons.template, color: "from-violet-500 to-purple-600" },
    { label: "Blast Terkirim", value: stats.blasts, href: "/blast", icon: statIcons.blast, color: "from-fuchsia-500 to-purple-700" },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Ringkasan data outreach sekolah Anda.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group relative rounded-2xl bg-white p-4 lg:p-5 border border-slate-200 hover:border-purple-300 hover:shadow-purple transition-all overflow-hidden"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${c.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className={`relative w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br ${c.color} text-white flex items-center justify-center mb-3 shadow-purple`}>
              {c.icon}
            </div>
            <div className="text-[10px] lg:text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{c.label}</div>
            <div className="text-2xl lg:text-3xl font-bold mt-1.5 text-slate-900">{c.value.toLocaleString("id-ID")}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg gradient-purple-soft flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="font-semibold text-slate-900">Mulai dari mana?</h2>
          </div>
          <ol className="space-y-3">
            {[
              { num: 1, text: "Buka", link: { href: "/scraper", label: "Scraper" }, after: "untuk ambil data sekolah berdasarkan provinsi/kabupaten." },
              { num: 2, text: "Periksa & rapikan data di", link: { href: "/sekolah", label: "Sekolah" }, after: "." },
              { num: 3, text: "Buat", link: { href: "/template", label: "Template Email" }, after: "dengan variabel {{nama_sekolah}}." },
              { num: 4, text: "Jalankan", link: { href: "/blast", label: "Blast" }, after: "ke target yang dipilih." },
            ].map((s) => (
              <li key={s.num} className="flex gap-3 items-start text-sm text-slate-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full gradient-purple text-white text-xs font-semibold flex items-center justify-center mt-0.5">
                  {s.num}
                </span>
                <span>
                  {s.text}{" "}
                  <Link className="text-purple-600 font-medium hover:text-purple-700 hover:underline" href={s.link.href}>
                    {s.link.label}
                  </Link>{" "}
                  {s.after}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 p-6 text-white shadow-lg shadow-purple-500/30">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Tips Outreach</h3>
          <p className="text-sm text-purple-100 leading-relaxed">
            Mulai dengan batch kecil 50-100 email/hari. Sertakan identitas yang jelas dan opsi opt-out di setiap template.
          </p>
        </div>
      </div>
    </div>
  );
}
