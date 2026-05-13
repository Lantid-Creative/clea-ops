// Mailbox edge function — IMAP/SMTP proxy for Stackmail
// Actions: connect, disconnect, status, list_messages, get_message, send,
//          mark_read, mark_unread, move_to_trash
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { ImapFlow } from "npm:imapflow@1.0.164";
import { simpleParser } from "npm:mailparser@3.7.1";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ----- Encryption (AES-GCM via Web Crypto) -----
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function getKey(): Promise<CryptoKey> {
  const hex = Deno.env.get("MAILBOX_ENCRYPTION_KEY");
  if (!hex || hex.length !== 64) {
    throw new Error("MAILBOX_ENCRYPTION_KEY missing or not 64 hex chars");
  }
  return crypto.subtle.importKey(
    "raw",
    hexToBytes(hex),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
async function encryptPassword(plain: string) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return { ciphertext: bytesToB64(new Uint8Array(ct)), iv: bytesToB64(iv) };
}
async function decryptPassword(ciphertext: string, iv: string) {
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(iv) },
    key,
    b64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(pt);
}

// ----- IMAP helpers -----
async function openImap(account: any, password: string) {
  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: true,
    auth: { user: account.email_address, pass: password },
    logger: false,
  });
  await client.connect();
  return client;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
        Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ----- connect -----
    if (action === "connect") {
      const {
        email_address,
        password,
        display_name = "",
        imap_host = "imap.stackmail.com",
        imap_port = 993,
        smtp_host = "smtp.stackmail.com",
        smtp_port = 465,
      } = body;
      if (!email_address || !password) {
        return json({ error: "email_address and password required" }, 400);
      }

      // Verify IMAP login
      try {
        const c = await openImap(
          { email_address, imap_host, imap_port },
          password,
        );
        await c.logout();
      } catch (e) {
        return json({ error: `IMAP login failed: ${(e as Error).message}` }, 400);
      }

      const enc = await encryptPassword(password);
      const { error } = await admin.from("email_accounts").upsert(
        {
          user_id: user.id,
          email_address,
          display_name,
          imap_host,
          imap_port,
          smtp_host,
          smtp_port,
          password_ciphertext: enc.ciphertext,
          password_iv: enc.iv,
          password_tag: "",
          last_verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // For everything else we need the saved account
    const { data: account, error: accErr } = await admin
      .from("email_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (accErr) return json({ error: accErr.message }, 500);

    if (action === "status") {
      return json({
        connected: !!account,
        email_address: account?.email_address ?? null,
        last_verified_at: account?.last_verified_at ?? null,
      });
    }

    if (action === "disconnect") {
      if (account) {
        await admin.from("email_accounts").delete().eq("id", account.id);
      }
      return json({ ok: true });
    }

    if (!account) return json({ error: "no mailbox connected" }, 400);
    const password = await decryptPassword(
      account.password_ciphertext,
      account.password_iv,
    );

    // ----- send (SMTP) -----
    if (action === "send") {
      const { to, subject, text, html, cc, bcc, in_reply_to, references } = body;
      if (!to || !subject) return json({ error: "to and subject required" }, 400);
      const transporter = nodemailer.createTransport({
        host: account.smtp_host,
        port: account.smtp_port,
        secure: account.smtp_port === 465,
        auth: { user: account.email_address, pass: password },
      });
      const info = await transporter.sendMail({
        from: account.display_name
          ? `"${account.display_name}" <${account.email_address}>`
          : account.email_address,
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        inReplyTo: in_reply_to,
        references,
      });
      return json({ ok: true, message_id: info.messageId });
    }

    // ----- IMAP actions -----
    const client = await openImap(account, password);
    try {
      const folder = (body.folder as string) || "INBOX";

      if (action === "list_messages") {
        const limit = Math.min(Number(body.limit) || 30, 100);
        const lock = await client.getMailboxLock(folder);
        try {
          const mailbox = client.mailbox as any;
          const total = mailbox?.exists ?? 0;
          const start = Math.max(1, total - limit + 1);
          const range = total === 0 ? "" : `${start}:${total}`;
          const messages: any[] = [];
          if (range) {
            for await (
              const msg of client.fetch(range, {
                envelope: true,
                flags: true,
                uid: true,
                internalDate: true,
                size: true,
              })
            ) {
              messages.push({
                uid: String(msg.uid),
                subject: msg.envelope?.subject ?? "",
                from: msg.envelope?.from?.[0]
                  ? {
                    name: msg.envelope.from[0].name ?? "",
                    address: msg.envelope.from[0].address ?? "",
                  }
                  : null,
                to: (msg.envelope?.to ?? []).map((a: any) => ({
                  name: a.name ?? "",
                  address: a.address ?? "",
                })),
                date: msg.envelope?.date ?? msg.internalDate,
                seen: msg.flags?.has("\\Seen") ?? false,
                flagged: msg.flags?.has("\\Flagged") ?? false,
                size: msg.size,
                message_id: msg.envelope?.messageId ?? null,
              });
            }
          }
          messages.reverse();
          await admin
            .from("email_accounts")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", account.id);
          return json({ messages, total });
        } finally {
          lock.release();
        }
      }

      if (action === "get_message") {
        const uid = String(body.uid);
        if (!uid) return json({ error: "uid required" }, 400);
        const lock = await client.getMailboxLock(folder);
        try {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg || !msg.source) return json({ error: "not found" }, 404);
          const parsed = await simpleParser(msg.source as Buffer);
          return json({
            uid,
            subject: parsed.subject ?? "",
            from: parsed.from?.value?.[0] ?? null,
            to: parsed.to ? (parsed.to as any).value ?? [] : [],
            cc: parsed.cc ? (parsed.cc as any).value ?? [] : [],
            date: parsed.date,
            text: parsed.text ?? "",
            html: parsed.html || null,
            message_id: parsed.messageId ?? null,
            in_reply_to: parsed.inReplyTo ?? null,
            references: parsed.references ?? null,
            attachments: (parsed.attachments ?? []).map((a: any) => ({
              filename: a.filename,
              contentType: a.contentType,
              size: a.size,
            })),
          });
        } finally {
          lock.release();
        }
      }

      if (
        action === "mark_read" || action === "mark_unread" ||
        action === "move_to_trash"
      ) {
        const uid = String(body.uid);
        if (!uid) return json({ error: "uid required" }, 400);
        const lock = await client.getMailboxLock(folder);
        try {
          if (action === "mark_read") {
            await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
          } else if (action === "mark_unread") {
            await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
          } else {
            try {
              await client.messageMove(uid, "Trash", { uid: true });
            } catch {
              await client.messageFlagsAdd(uid, ["\\Deleted"], { uid: true });
            }
          }
          return json({ ok: true });
        } finally {
          lock.release();
        }
      }

      return json({ error: `unknown action: ${action}` }, 400);
    } finally {
      await client.logout().catch(() => {});
    }
  } catch (e) {
    console.error("mailbox error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
