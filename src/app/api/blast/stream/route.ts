import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { renderTemplate, sendEmailBrevo, type BrevoAttachment } from "@/lib/email/brevo";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 menit
export const dynamic = "force-dynamic";

type SSEEvent =
  | { type: "start"; total: number; nama_batch: string }
  | { type: "progress"; current: number; total: number; sukses: number; gagal: number; school: { nama: string; email: string; status: "sent" | "failed"; error?: string } }
  | { type: "done"; blast_id: string; sukses: number; gagal: number }
  | { type: "error"; message: string };

function sseEncode(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nama_batch,
    template_id,
    school_ids,
    delay_ms = 1500,
  } = body ?? {};

  if (!nama_batch || !template_id || !Array.isArray(school_ids) || school_ids.length === 0) {
    return new Response("nama_batch, template_id, school_ids[] wajib", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (e: SSEEvent) => controller.enqueue(enc.encode(sseEncode(e)));

      try {
        const supabase = getSupabaseAdmin();

        // Load template
        const { data: tmpl, error: tErr } = await supabase
          .from("email_templates")
          .select("*")
          .eq("id", template_id)
          .single();
        if (tErr || !tmpl) {
          send({ type: "error", message: "Template tidak ditemukan" });
          controller.close();
          return;
        }

        // Siapkan attachment
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

        // Load schools
        const { data: schools, error: sErr } = await supabase
          .from("schools")
          .select("id, nama, npsn, kabupaten, email")
          .in("id", school_ids)
          .not("email", "is", null);
        if (sErr || !schools || schools.length === 0) {
          send({ type: "error", message: "Tidak ada sekolah dengan email" });
          controller.close();
          return;
        }

        // Buat blast record
        const { data: blast, error: bErr } = await supabase
          .from("email_blasts")
          .insert({
            template_id,
            nama_batch,
            total_target: schools.length,
            status: "running",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (bErr || !blast) {
          send({ type: "error", message: bErr?.message ?? "Gagal buat blast" });
          controller.close();
          return;
        }

        send({ type: "start", total: schools.length, nama_batch });

        let sukses = 0;
        let gagal = 0;

        for (let i = 0; i < schools.length; i++) {
          const s = schools[i];
          const vars = {
            nama_sekolah: s.nama,
            npsn: s.npsn,
            kabupaten: s.kabupaten,
          };
          let logStatus: "sent" | "failed" = "sent";
          let errorMsg: string | undefined;

          try {
            const result = await sendEmailBrevo({
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
              message_id: result.messageId,
            });
          } catch (e) {
            gagal++;
            logStatus = "failed";
            errorMsg = (e as Error).message.slice(0, 200);
            await supabase.from("email_blast_logs").insert({
              blast_id: blast.id,
              school_id: s.id,
              email: s.email!,
              status: "failed",
              error_message: (e as Error).message.slice(0, 500),
            });
          }

          send({
            type: "progress",
            current: i + 1,
            total: schools.length,
            sukses,
            gagal,
            school: {
              nama: s.nama,
              email: s.email!,
              status: logStatus,
              error: errorMsg,
            },
          });

          if (i < schools.length - 1) await sleep(delay_ms);
        }

        // Update blast status
        await supabase
          .from("email_blasts")
          .update({
            total_terkirim: sukses,
            total_gagal: gagal,
            status: gagal === schools.length ? "failed" : "done",
            finished_at: new Date().toISOString(),
          })
          .eq("id", blast.id);

        send({ type: "done", blast_id: blast.id, sukses, gagal });
      } catch (e) {
        send({ type: "error", message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
