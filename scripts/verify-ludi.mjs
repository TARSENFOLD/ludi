/** Integration gate against Nitro's actual production HTTP/SSE boundary. No browser required. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { once } from "node:events";

const testOnda = process.argv.includes("--onda");
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
    "Uma caminhada sem destino",
    "Um robot que só conta piadas más",
  ]) {
    assert(!source.includes(secret), `Room content leaked into client asset ${file}`);
  }
  checked++;
}
assert(checked > 0);
console.log(`Bundle privacy: ${checked} client assets contain no Ludi room content.`);

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
    LUDI_ONDA_PREVIEW: testOnda ? "1" : "0",
    NUXT_PUBLIC_LUDI_ONDA_PREVIEW: testOnda ? "true" : "false",
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
  assert.match(catalogue, /Quem está(?:<[^>]+>|\s)+por aí\?/);
  assert(!catalogue.includes("Catálogo Doot (legado)"));
  assert(!catalogue.includes("family=Baloo"));
  assert.equal((await fetch(`${base}/ludi/icon.svg`)).status, 200);
  for (const path of ["/api/auth/sign-up/email", "/api/admin/users", "/mcp", "/api/games", "/api/uploads/presign", "/login"]) {
    for (const method of ["GET", "POST"]) {
      const blocked = await fetch(`${base}${path}`, { method });
      assert.equal(blocked.status, 404, `Public profile exposed ${method} ${path}`);
    }
  }
  console.log("Public profile: root entry, catalogue and legacy API isolation passed.");
  if (testOnda) {
    const probe = client();
    for (const gameId of ['../spectrum'])
      assert.equal((await probe.request('', { name: 'Teste', id: id(), gameId })).status, 400);
    for (const count of [2, 3, 6]) {
      const people = Array.from({ length: count }, client);
      const createOnda = { name: 'Pessoa 0', id: id(), gameId: 'na-mesma-onda' };
      const created = await people[0].request('', createOnda);
      assert.equal(created.status, 200);
      const room = created.body.code;
      assert.equal((await people[0].request('', createOnda)).body.code, room);
      assert.equal((await people[0].request('', { ...createOnda, gameId: 'entre-nos' })).status, 409);
      for (let i = 1; i < count; i++) assert.equal((await people[i].request(`/${room}/join`, { name: `Pessoa ${i}` })).status, 200);
      const roster = (await people[0].request(`/${room}`)).body.players;
      const hostEvents = await people[0].stream(room), guestEvents = await people[1].stream(room);
      streams.push(hostEvents, guestEvents);
      let state = created.body;
      const sendOnda = async (index, type, value, extras = {}) => {
        const response = await people[index].request(`/${room}/actions`, {
          id: id(), match: state.match, round: state.round, type,
          ...(value === undefined ? {} : { value }), ...extras,
        });
        if (response.status === 200) state = response.body;
        return response;
      };
      assert.equal((await sendOnda(1, 'start')).status, 409);
      assert.equal((await sendOnda(0, 'start')).status, 200);
      const topics = [];
      for (let r = 0; r < 6; r++) {
        topics.push(state.content.prompt);
        if (r === 0) {
          assert.equal((await sendOnda(0, 'answer', 100.5)).status, 400);
          assert.equal((await sendOnda(0, 'answer', 50, { choice: 1 })).status, 400);
          assert.equal((await sendOnda(0, 'answer', 50, { participantId: roster[1].id })).status, 400);
        }
        for (let i = 0; i < count; i++) {
          assert.equal((await sendOnda(i, 'answer', i === 0 ? 20 : 80)).status, 200);
          assert.equal(state.reveal, undefined);
          assert.equal(state.scores, undefined);
          assert.equal(state.history, undefined);
          assert.equal(state.ownValue, i === 0 ? 20 : 80);
        }
        const resumed = (await people[0].request(`/${room}`)).body;
        assert.equal(resumed.ownValue, 20);
        assert.equal(resumed.context.participantId, roster[0].id);
        assert.equal(resumed.roundState, 'locked');
        assert.equal((await sendOnda(0, 'answer', 80)).status, 409);
        assert.equal((await sendOnda(0, 'reveal')).status, 200);
        assert.deepEqual(state.reveal.marks, [20, ...Array(count - 1).fill(80)]);
        assert.equal((await sendOnda(0, r === 5 ? 'finish' : 'next')).status, 200);
      }
      assert.equal(state.phase, 'results');
      assert.equal(state.history.length, 6);
      if (count === 2) assert.deepEqual(state.scores.map(p => p.score), [2400, 2400]);
      const replayOnda = { id: id(), match: state.match, round: state.round, type: 'replay' };
      const repeated = await Promise.all([people[0].request(`/${room}/actions`, replayOnda), people[0].request(`/${room}/actions`, replayOnda)]);
      for (const response of repeated) {
        assert.equal(response.status, 200); assert.equal(response.body.match, 2);
        assert.deepEqual(response.body.players, roster);
        assert.equal(response.body.ownValue, undefined); assert.equal(response.body.scores, undefined);
        assert(!topics.includes(response.body.content.prompt));
      }
      assert.equal(repeated[0].body.content.prompt, repeated[1].body.content.prompt);
      for (let i = 0; i < 100 && guestEvents.events.at(-1)?.match !== 2; i++) await new Promise(resolve => setTimeout(resolve, 10));
      for (const [stream, own] of [[hostEvents, 20], [guestEvents, 80]]) {
        assert(stream.events.length >= 10);
        for (const event of stream.events) {
          assert(!JSON.stringify(event).match(/"inputs":|"token":|ludi_session/));
          if (event.phase !== 'results' && event.roundState !== 'reveal') {
            assert.equal(event.reveal, undefined); assert.equal(event.scores, undefined); assert.equal(event.history, undefined);
          }
          if (event.ownValue !== undefined) assert.equal(event.ownValue, own);
        }
      }
    }
    console.log('Na Mesma Onda HTTP/SSE: 2/3/6 independent sessions, six rounds, privacy, identity, reload, strict actions and idempotent replay passed.');
  } else {
    assert.equal((await fetch(`${base}/ludi/na-mesma-onda`)).status, 404);
    assert(!catalogue.includes('Estão na mesma onda?'));
    assert.equal((await client().request('', { name: 'Teste', id: id(), gameId: 'na-mesma-onda' })).status, 400);

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
  }
} finally {
  for (const stream of streams) await stream.close();
  child.kill("SIGTERM");
  if (child.exitCode === null) await once(child, "exit");
}
