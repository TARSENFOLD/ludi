import { createEventStream } from "h3";
import { ludiRooms } from "../../../../utils/ludi-rooms";
import { ludiApi, ludiRequest } from "../../../../utils/ludi-http";
export default defineEventHandler((event) =>
  ludiApi(() => {
    const token = ludiRequest(event);
    const code = getRouterParam(event, "code") ?? "";
    ludiRooms.view(code, token);
    setHeader(event, "X-Accel-Buffering", "no");
    const stream = createEventStream(event);
    const unsubscribe = ludiRooms.subscribe(
      code,
      token,
      (view) => {
        void stream
          .push({ id: String(view.revision), event: "snapshot", data: JSON.stringify(view) })
          .catch(() => stream.close());
      },
      () => {
        void stream.push({ event: "expired", data: "{}" }).finally(() => stream.close());
      },
    );
    const heartbeat = setInterval(() => {
      void stream.push({ event: "ping", data: "{}" }).catch(() => stream.close());
    }, 15_000);
    stream.onClosed(() => {
      clearInterval(heartbeat);
      unsubscribe();
    });
    return stream.send();
  }),
);
