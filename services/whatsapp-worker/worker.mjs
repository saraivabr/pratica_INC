import http from "http";
import { URL } from "url";
import { randomBytes, randomUUID, createCipheriv, createDecipheriv } from "crypto";
import { Pool } from "pg";
import dotenv from "dotenv";
import {
  BufferJSON,
  initAuthCreds,
  makeWASocket,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";

dotenv.config({ path: new URL("../../.env.local", import.meta.url).pathname });
dotenv.config({ path: new URL("./.env", import.meta.url).pathname });

const PORT = Number(process.env.WHATSAPP_WORKER_PORT || 3005);
const APP_WEBHOOK_URL = process.env.WHATSAPP_APP_WEBHOOK_URL;
const SESSION_KEY = process.env.WHATSAPP_SESSION_KEY;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
if (!SESSION_KEY) {
  throw new Error("WHATSAPP_SESSION_KEY is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sessions = new Map();
const channelSessions = new Map();
const sseClients = new Map();

function getKeyBuffer() {
  if (SESSION_KEY.length === 64 && /^[0-9a-f]+$/i.test(SESSION_KEY)) {
    return Buffer.from(SESSION_KEY, "hex");
  }
  return Buffer.from(SESSION_KEY, "base64");
}

function encryptString(plainText) {
  const iv = randomBytes(12);
  const key = getKeyBuffer();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptString(payload) {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const key = getKeyBuffer();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function jsonStringify(data) {
  return JSON.stringify(data, BufferJSON.replacer);
}

function jsonParse(data) {
  return JSON.parse(data, BufferJSON.reviver);
}

async function getSessionRecord(userId) {
  const { rows } = await pool.query(
    `select * from whatsapp_sessions where user_id = $1 limit 1`,
    [userId]
  );
  return rows[0] || null;
}

async function upsertSessionRecord({
  userId,
  tenantId,
  status,
  pairedPhone,
  deviceName,
  lastQr,
  errorLog,
}) {
  await pool.query(
    `insert into whatsapp_sessions
      (user_id, imobiliaria_id, status, paired_phone, device_name, last_qr, last_qr_at, last_seen_at, error_log, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now(), $7, now())
     on conflict (user_id)
     do update set
       imobiliaria_id = excluded.imobiliaria_id,
       status = excluded.status,
       paired_phone = excluded.paired_phone,
       device_name = excluded.device_name,
       last_qr = excluded.last_qr,
       last_qr_at = excluded.last_qr_at,
       last_seen_at = excluded.last_seen_at,
       error_log = excluded.error_log,
       updated_at = excluded.updated_at`,
    [userId, tenantId, status, pairedPhone, deviceName, lastQr, errorLog || null]
  );
}

async function saveSessionData(userId, data) {
  const encrypted = encryptString(jsonStringify(data));
  await pool.query(
    `update whatsapp_sessions
     set session_data = $1, updated_at = now()
     where user_id = $2`,
    [encrypted, userId]
  );
}

async function loadSessionData(userId) {
  const record = await getSessionRecord(userId);
  if (!record?.session_data) return null;
  const decrypted = decryptString(record.session_data);
  return jsonParse(decrypted);
}

function ensureSseChannel(channelId, tenantId, userId) {
  channelSessions.set(channelId, { tenantId, userId });
}

function broadcastToSession(tenantId, userId, payload) {
  for (const [channelId, sessionInfo] of channelSessions.entries()) {
    if (sessionInfo.tenantId === tenantId && sessionInfo.userId === userId) {
      const clients = sseClients.get(channelId);
      if (!clients) continue;
      for (const res of clients) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    }
  }
}

async function createAuthState(tenantId, userId) {
  const stored = await loadSessionData(userId);
  const authData = stored || { creds: initAuthCreds(), keys: {} };
  const keyStore = authData.keys || {};

  const state = {
    creds: authData.creds,
    keys: {
      get: async (type, ids) => {
        const data = {};
        for (const id of ids) {
          data[id] = keyStore?.[type]?.[id];
        }
        return data;
      },
      set: async (data) => {
        for (const category of Object.keys(data)) {
          keyStore[category] = keyStore[category] || {};
          Object.assign(keyStore[category], data[category]);
        }
        authData.keys = keyStore;
        await saveSessionData(userId, authData);
      },
    },
  };

  const save = async () => {
    await saveSessionData(userId, authData);
  };

  return { state, save };
}

async function ensureSession(tenantId, userId) {
  const existing = sessions.get(userId);
  if (existing) return existing;

  const { state, save } = await createAuthState(tenantId, userId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  const session = {
    tenantId,
    userId,
    status: "connecting",
    socket: sock,
    lastQr: null,
    pairedPhone: null,
    deviceName: null,
  };

  sessions.set(userId, session);
  await upsertSessionRecord({ userId, tenantId, status: "connecting" });

  sock.ev.on("creds.update", async () => {
    await save();
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;
    if (qr) {
      session.status = "qr";
      session.lastQr = qr;
      await upsertSessionRecord({
        userId,
        tenantId,
        status: "qr",
        lastQr: qr,
        pairedPhone: session.pairedPhone,
        deviceName: session.deviceName,
      });
      broadcastToSession(tenantId, userId, { status: "qr", qr });
    }

    if (connection === "open") {
      const jid = sock.user?.id || "";
      session.pairedPhone = jid.split("@")[0] || null;
      session.deviceName = sock.user?.name || null;
      session.status = "ready";
      await upsertSessionRecord({
        userId,
        tenantId,
        status: "ready",
        pairedPhone: session.pairedPhone,
        deviceName: session.deviceName,
        lastQr: null,
      });
      broadcastToSession(tenantId, userId, {
        status: "ready",
        pairedPhone: session.pairedPhone,
        deviceName: session.deviceName,
      });
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.message || "disconnected";
      session.status = "disconnected";
      await upsertSessionRecord({
        userId,
        tenantId,
        status: "disconnected",
        pairedPhone: session.pairedPhone,
        deviceName: session.deviceName,
        errorLog: reason,
      });
      broadcastToSession(tenantId, userId, {
        status: "disconnected",
        error: reason,
      });
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    if (!APP_WEBHOOK_URL) return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const text = extractMessageText(msg.message);
      if (!text) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid) continue;
      const payload = {
        tenantId,
        userId,
        from: remoteJid.split("@")[0],
        text,
        messageId: msg.key.id,
        timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) : undefined,
      };
      try {
        await fetch(APP_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("Webhook dispatch error", error);
      }
    }
  });

  return session;
}

function extractMessageText(message) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.buttonsResponseMessage?.selectedButtonId ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    null
  );
}

async function handleStart(req, res, tenantId, userId) {
  const session = await ensureSession(tenantId, userId);
  const channelId = randomUUID();
  ensureSseChannel(channelId, tenantId, userId);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: session.status,
      qr: session.lastQr,
      pairedPhone: session.pairedPhone,
      deviceName: session.deviceName,
      channelId,
    })
  );
}

async function handleStatus(req, res, tenantId, userId) {
  const record = await getSessionRecord(userId);
  const payload = record
    ? {
        status: record.status,
        pairedPhone: record.paired_phone,
        deviceName: record.device_name,
        lastQr: record.last_qr,
        error: record.error_log,
      }
    : { status: "disconnected" };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function handleLogout(req, res, tenantId, userId) {
  const session = sessions.get(userId);
  if (session?.socket) {
    try {
      await session.socket.logout();
    } catch {
      // ignore
    }
  }
  sessions.delete(userId);
  await upsertSessionRecord({
    userId,
    tenantId,
    status: "disconnected",
    pairedPhone: null,
    deviceName: null,
    lastQr: null,
  });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true }));
}

async function handleSend(req, res, tenantId, userId) {
  const session = await ensureSession(tenantId, userId);
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      const payload = JSON.parse(body || "{}");
      const to = payload.to;
      const message = payload.message;
      if (!to || !message) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "to e message são obrigatórios" }));
        return;
      }
      const jid = `${to.replace(/\D/g, "")}@s.whatsapp.net`;
      const result = await session.socket.sendMessage(jid, { text: message });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, messageId: result?.key?.id }));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Erro ao enviar mensagem" }));
    }
  });
}

function handleStream(req, res, tenantId, userId, channelId) {
  ensureSseChannel(channelId, tenantId, userId);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const existing = sseClients.get(channelId) || new Set();
  existing.add(res);
  sseClients.set(channelId, existing);

  req.on("close", () => {
    const clients = sseClients.get(channelId);
    if (!clients) return;
    clients.delete(res);
    if (clients.size === 0) {
      sseClients.delete(channelId);
      channelSessions.delete(channelId);
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts[0] !== "api" || parts[1] !== "whatsapp") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const tenantId = parts[2];
  const userId = parts[3];
  const action = parts[4];
  if (!tenantId || !userId || !action) {
    res.writeHead(400);
    res.end("Invalid path");
    return;
  }

  if (req.method === "POST" && action === "start") {
    await handleStart(req, res, tenantId, userId);
    return;
  }

  if (req.method === "GET" && action === "status") {
    await handleStatus(req, res, tenantId, userId);
    return;
  }

  if (req.method === "POST" && action === "logout") {
    await handleLogout(req, res, tenantId, userId);
    return;
  }

  if (req.method === "POST" && action === "send") {
    await handleSend(req, res, tenantId, userId);
    return;
  }

  if (req.method === "GET" && action === "stream") {
    const channelId = url.searchParams.get("channel");
    if (!channelId) {
      res.writeHead(400);
      res.end("Missing channel");
      return;
    }
    handleStream(req, res, tenantId, userId, channelId);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`WhatsApp worker running on port ${PORT}`);
});
