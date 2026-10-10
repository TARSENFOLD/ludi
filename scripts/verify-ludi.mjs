/** Integration gate against Nitro's actual production HTTP/SSE boundary. No browser required. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { once } from "node:events";

const root = new URL("../", import.meta.url);
const files = await readdir(new URL("apps/web/.output/public/_nuxt/", root), { recursive: true });
let checked = 0;
for (const file of files.filter((f) => /\.(js|map)$/.test(f))) {
  const source = await readFile(new URL(`apps/web/.output/public/_nuxt/${file}`, root), "utf8");
  for (const secret of [
    "Numa corrida, ultrapassas",
    "um quilo de algodão",
    "Temos cinco minutos livres.",
    "Se hoje tivesse uma banda sonora",
  ]) {
    assert(!source.includes(secret), `Room content leaked into client asset ${file}`);
  }
  checked++;
}
assert(checked > 0);
console.log(`Bundle privacy: ${checked} client assets contain no Entre Nós room content.`);

const socket = createServer().listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["apps/web/.output/server/index.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: "file::memory:",
    DOOT_BACKUP_DISABLED: "1",
    DOOT_EPHEMERAL_LIFECYCLE_DISABLED: "1",
    SESSION_PASSWORD: randomBytes(32).toString("hex"),
    NITRO_HOST: "127.0.0.1",
    NITRO_PORT: String(port),
    LUDI_PUBLIC_ORIGIN: base,
    LUDI_PUBLIC_ONLY: "1",
    NUXT_PUBLIC_LUDI_PUBLIC_ONLY: "true",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
for (const stream of [child.stdout, child.stderr])
  stream.on("data", (chunk) => {
    serverLog = (serverLog + chunk).slice(-3000);
  });
const id = () => randomBytes(16).toString("hex");
function client() {
  let cookie = "";
  return {
    async request(path, body, extra = {}) {
      const response = await fetch(`${base}/api/ludi/rooms${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body === undefined ? {} : { Origin: base, "Content-Type": "application/json" }),
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      return { status: response.status, headers: response.headers, body: await response.json() };
    },
    async stream(code) {
      const abort = new AbortController();
      const response = await fetch(`${base}/api/ludi/rooms/${code}/events`, {
        headers: { Cookie: cookie },
        signal: abort.signal,
      });
      assert.equal(response.status, 200);
      assert(response.headers.get("content-type").includes("text/event-stream"));
      const events = [];
      const read = (async () => {
        let buffer = "";
        for await (const bytes of response.body) {
          buffer += new TextDecoder().decode(bytes);
          let index = buffer.indexOf("\n\n");
          while (index !== -1) {
            const message = buffer.slice(0, index);
            buffer = buffer.slice(index + 2);
            if (message.includes("event: snapshot")) {
              const value = JSON.parse(
                message
                  .split("\n")
                  .find((line) => line.startsWith("data:"))
                  .slice(5)
                  .trim(),
              );
              events.push(value);
            }
            index = buffer.indexOf("\n\n");
          }
        }
      })().catch((error) => {
        if (error.name !== "AbortError") throw error;
      });
      return {
        events,
        close: async () => {
          abort.abort();
          await read;
        },
      };
    },
  };
}
const streams = [];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${base}/api/ludi/rooms/MISSING`);
      ready = true;
      break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert(ready, `Nitro did not start: ${serverLog}`);
  const rootResponse = await fetch(base, { redirect: "manual" });
  assert.equal(rootResponse.status, 302);
  assert.equal(rootResponse.headers.get("location"), "/ludi");
  const catalogue = await (await fetch(`${base}/ludi`)).text();
  assert(catalogue.includes("Quem está por aí?"));
  assert(!catalogue.includes("Explorar o catálogo Doot"));
  for (const path of ["/api/auth/sign-up/email", "/api/admin/users", "/mcp", "/api/games", "/api/uploads/presign", "/login"]) {
    for (const method of ["GET", "POST"]) {
      const blocked = await fetch(`${base}${path}`, { method });
      assert.equal(blocked.status, 404, `Public profile exposed ${method} ${path}`);
    }
  }
  console.log("Public profile: root entry, catalogue and legacy API isolation passed.");
  const creator = client();
  const guest = client();
  const stranger = client();
  assert.equal(
    (await creator.request("", { name: "Ana", id: id() }, { Origin: "https://foreign.invalid" }))
      .status,
    403,
  );
  assert.equal(
    (await creator.request("", { name: "Ana", id: id() }, { Origin: "null" })).status,
    403,
  );
  const create = { name: "Ana", id: id() };
  let result = await creator.request("", create);
  assert.equal(result.status, 200);
  assert.match(result.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(result.headers.get("set-cookie"), /SameSite=Lax/i);
  assert.match(result.headers.get("cache-control"), /no-store/);
  const code = result.body.code;
  assert.equal((await creator.request("", create)).body.code, code);
  assert.equal((await stranger.request(`/${code}`)).status, 401);
  assert.equal((await stranger.request(`/${code}/join`, { name: "Ana" })).status, 409);
  assert.equal((await guest.request(`/${code}/join`, { name: "Beto" })).status, 200);
  assert.equal((await stranger.request(`/${code}/join`, { name: "Carla" })).status, 409);
  const creatorStream = await creator.stream(code);
  const guestStream = await guest.stream(code);
  streams.push(creatorStream, guestStream);
  let view = (await creator.request(`/${code}`)).body;
  const command = async (c, type, choice, overrides = {}) => {
    const v = (await c.request(`/${code}`)).body;
    return c.request(`/${code}/actions`, {
      id: id(),
      match: v.match,
      round: v.round,
      type,
      ...(choice === undefined ? {} : { choice }),
      ...overrides,
    });
  };
  assert.equal((await command(guest, "start")).status, 409);
  assert.equal(
    (await command(creator, "start", undefined, { participantId: view.context.participantId }))
      .status,
    400,
  );
  assert.equal((await command(creator, "start")).status, 200);
  for (let round = 0; round < 4; round++) {
    assert.equal((await command(creator, "answer", 99)).status, 400);
    result = await command(creator, "answer", [0, 1, 2, 2][round]);
    assert.equal(result.status, 200);
    view = result.body;
    assert.equal(view.ownChoice, [0, 1, 2, 2][round]);
    assert.equal(view.reveal, undefined);
    assert.equal((await guest.request(`/${code}`)).body.ownChoice, undefined);
    const resumed = (await creator.request(`/${code}`)).body;
    assert.equal(resumed.context.participantId, view.context.participantId);
    assert.equal(resumed.ownChoice, view.ownChoice);
    assert.equal((await command(guest, "answer", [1, 0, 0, 1][round])).status, 200);
    assert.equal((await command(guest, "answer", 0)).status, 409);
    assert.equal((await command(creator, "reveal")).status, 200);
    assert.equal((await command(creator, round === 3 ? "finish" : "next")).status, 200);
  }
  view = (await creator.request(`/${code}`)).body;
  assert.equal(view.phase, "results");
  assert.deepEqual(
    view.scores.map((p) => p.score),
    [2, 0],
  );
  const replay = { id: id(), match: view.match, round: view.round, type: "replay" };
  const replays = await Promise.all([
    creator.request(`/${code}/actions`, replay),
    creator.request(`/${code}/actions`, replay),
  ]);
  for (const r of replays) {
    assert.equal(r.status, 200);
    assert.equal(r.body.match, 2);
    assert.equal(r.body.ownChoice, undefined);
    assert.equal(r.body.scores, undefined);
  }
  for (let i = 0; i < 100 && guestStream.events.at(-1)?.match !== 2; i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  for (const stream of streams) {
    assert(stream.events.length >= 10, "Expected real SSE updates");
    for (const event of stream.events) {
      assert(!JSON.stringify(event).match(/"correct":|"inputs":|answerKeys|ludi_session/));
      if (event.phase !== "results" && event.roundState !== "reveal") {
        assert.equal(event.reveal, undefined);
        assert.equal(event.scores, undefined);
      }
    }
    assert.deepEqual(
      stream.events.map((v) => v.revision),
      stream.events.map((v) => v.revision).sort((a, b) => a - b),
    );
  }
  // Last-seat race through two independent anonymous HTTP sessions.
  const otherRoom = (await creator.request("", { name: "Ana", id: id() })).body.code;
  const lastSeat = await Promise.all([
    client().request(`/${otherRoom}/join`, { name: "B" }),
    client().request(`/${otherRoom}/join`, { name: "C" }),
  ]);
  assert.deepEqual(lastSeat.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await creator.request(`/${code}/actions`, { padding: "x".repeat(5000) })).status,
    413,
  );
  console.log(
    "Nitro HTTP/SSE: identity, cookies, origin, validation, four rounds, reconnect snapshots, atomic join, privacy, replay and body limit passed.",
  );
} finally {
  for (const stream of streams) await stream.close();
  child.kill("SIGTERM");
  if (child.exitCode === null) await once(child, "exit");
}
