import { randomBytes } from "node:crypto";
import {
  createError,
  getCookie,
  setCookie,
  getRequestURL,
  getRequestHeader,
  getRequestIP,
  setHeader,
  type H3Event,
} from "h3";
import { LudiError } from "@doot-games/games/ludi/controller";
import { ludiClientIp } from './ludi-client-ip';

const buckets = new Map<string, { count: number; until: number }>();
let sweptAt = 0;
function limit(key: string, max: number) {
  const now = Date.now();
  if (now - sweptAt > 60_000) {
    for (const [key, bucket] of buckets) if (bucket.until < now) buckets.delete(key);
    sweptAt = now;
  }
  let bucket = buckets.get(key);
  if (!bucket || bucket.until <= now) {
    bucket = { count: 0, until: now + 60_000 };
    buckets.set(key, bucket);
  }
  if (++bucket.count > max) throw new LudiError(429, "Demasiados pedidos. Aguarda um minuto.");
}
export function checkLudiOrigin(origin: string | undefined, target: string) {
  if (!origin || origin !== target) throw new LudiError(403, "Origem do pedido não permitida.");
}
export function ludiRequestIp(event: H3Event) {
  return ludiClientIp(getRequestIP(event), getRequestHeader(event, 'x-forwarded-for'), process.env.LUDI_TRUSTED_PROXY_IP);
}
export function ludiRequest(event: H3Event, write = false, creating = false) {
  setHeader(event, "Cache-Control", "no-store, private");
  setHeader(event, "Vary", "Cookie");
  // Forwarded headers are ignored unless the direct peer is our configured proxy.
  const ip = ludiRequestIp(event);
  const origin =
    process.env.LUDI_PUBLIC_ORIGIN ||
    getRequestURL(event, { xForwardedHost: false, xForwardedProto: false }).origin;
  limit(`ip:${ip}`, 240);
  if (write) {
    checkLudiOrigin(getRequestHeader(event, "origin"), origin);
    if (!getRequestHeader(event, "content-type")?.startsWith("application/json"))
      throw new LudiError(415, "Envia JSON.");
    if (creating) limit(`create:${ip}`, 10);
  }
  let token = getCookie(event, "ludi_session");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!write) throw new LudiError(401, "Entra na sala para jogar.");
    token = randomBytes(32).toString("hex");
  }
  limit(`session:${token}`, 120);
  setCookie(event, "ludi_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(origin).protocol === "https:",
    path: "/api/ludi",
    maxAge: 8 * 60 * 60,
  });
  return token;
}
/** Bound bytes while reading, including chunked requests without Content-Length. */
export async function ludiBody(event: H3Event): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of event.node.req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 4096) throw new LudiError(413, "Pedido demasiado grande.");
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new LudiError(400, "JSON inválido.");
  }
}
export async function ludiApi<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof LudiError)
      throw createError({ statusCode: error.status, message: error.message });
    // Never serialize internal errors, credentials or participant inputs.
    throw createError({ statusCode: 500, message: "Não foi possível concluir o pedido." });
  }
}
