import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const [tmplRes, schoolRes] = await Promise.all([
    supabase
      .from("email_templates")
      .select("id, nama, subject, attachment_name")
      .order("updated_at", { ascending: false }),
    supabase
      .from("schools")
      .select("id, nama, email, provinsi, kabupaten, kecamatan, jenjang, status")
      .not("email", "is", null)
      .order("nama")
      .limit(2000),
  ]);

  if (tmplRes.error) {
    return NextResponse.json({ error: tmplRes.error.message }, { status: 500 });
  }
  if (schoolRes.error) {
    return NextResponse.json({ error: schoolRes.error.message }, { status: 500 });
  }

  const schools = schoolRes.data ?? [];

  // Kumpulkan unique values untuk filter dropdown
  const uniq = (key: keyof (typeof schools)[number]) => {
    const set = new Set<string>();
    for (const s of schools) {
      const v = s[key];
      if (v && typeof v === "string") set.add(v);
    }
    return Array.from(set).sort();
  };

  return NextResponse.json({
    templates: tmplRes.data ?? [],
    schools,
    filters: {
      provinsi: uniq("provinsi"),
      kabupaten: uniq("kabupaten"),
      kecamatan: uniq("kecamatan"),
      jenjang: uniq("jenjang"),
      status: uniq("status"),
    },
  });
}
