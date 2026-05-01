import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { renderTemplate, sendEmailBrevo, type BrevoAttachment } from "@/lib/email/brevo";

export const runtime = "nodejs";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nama_batch,
    template_id,
    school_ids,
    delay_ms = 1500,
    dry_run = false,
  } = body ?? {};

  if (!nama_batch || !template_id || !Array.isArray(school_ids) || school_ids.length === 0) {
    return NextResponse.json(
      { error: "nama_batch, template_id, school_ids[] wajib" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: tmpl, error: tErr } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", template_id)
    .single();
  if (tErr || !tmpl) {
    return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
  }

  // Siapkan attachment kalau template punya
  let attachments: BrevoAttachment[] | undefined;
  if (tmpl.attachment_path) {
    const { data: signed } = await supabase.storage
      .from("attachments")
      .createSignedUrl(tmpl.attachment_path, 60 * 60 * 24);
    if (signed?.signedUrl) {
      attachments = [
        {
          name: tmpl.attachment_name ?? "Proposal.pdf",
          url: signed.signedUrl,
        },
      ];
    }
  }

  const { data: schools, error: sErr } = await supabase
    .from("schools")
    .select("id, nama, npsn, kabupaten, email")
    .in("id", school_ids)
    .not("email", "is", null);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!schools || schools.length === 0) {
    return NextResponse.json({ error: "Tidak ada sekolah dengan email" }, { status: 400 });
  }

  const { data: blast, error: bErr } = await supabase
    .from("email_blasts")
    .insert({
      template_id,
      nama_batch,
      total_target: schools.length,
      status: dry_run ? "draft" : "running",
      started_at: dry_run ? null : new Date().toISOString(),
    })
    .select()
    .single();
  if (bErr || !blast) return NextResponse.json({ error: bErr?.message }, { status: 500 });

  if (dry_run) {
    return NextResponse.json({
      blast_id: blast.id,
      preview: schools.slice(0, 3).map((s) => ({
        to: s.email,
        subject: renderTemplate(tmpl.subject, {
          nama_sekolah: s.nama,
          npsn: s.npsn,
          kabupaten: s.kabupaten,
        }),
        attachment: attachments?.[0]?.name ?? null,
      })),
      total: schools.length,
      hasAttachment: !!attachments,
    });
  }

  let sukses = 0;
  let gagal = 0;
  for (const s of schools) {
    const vars = {
      nama_sekolah: s.nama,
      npsn: s.npsn,
      kabupaten: s.kabupaten,
    };
    try {
      await sendEmailBrevo({
        to: { email: s.email!, name: s.nama },
        subject: renderTemplate(tmpl.subject, vars),
        htmlContent: renderTemplate(tmpl.body_html, vars),
        textContent: tmpl.body_text ? renderTemplate(tmpl.body_text, vars) : undefined,
        attachments,
      });
      sukses++;
      await supabase.from("email_blast_logs").insert({
        blast_id: blast.id,
        school_id: s.id,
        email: s.email!,
        status: "sent",
      });
    } catch (e) {
      gagal++;
      await supabase.from("email_blast_logs").insert({
        blast_id: blast.id,
        school_id: s.id,
        email: s.email!,
        status: "failed",
        error_message: (e as Error).message.slice(0, 500),
      });
    }
    await sleep(delay_ms);
  }

  await supabase
    .from("email_blasts")
    .update({
      total_terkirim: sukses,
      total_gagal: gagal,
      status: gagal === schools.length ? "failed" : "done",
      finished_at: new Date().toISOString(),
    })
    .eq("id", blast.id);

  return NextResponse.json({ blast_id: blast.id, sukses, gagal });
}
