import { z, participantNameSchema } from "@doot-games/sdk/ludi";
import { LudiError } from "@doot-games/games/ludi/controller";
import { ludiRooms } from "../../../utils/ludi-rooms";
import { ludiApi, ludiBody, ludiRequest, ludiRequestIp } from "../../../utils/ludi-http";
export default defineEventHandler((event) =>
  ludiApi(async () => {
    const token = ludiRequest(event, true, true);
    const body = z
      .object({ name: participantNameSchema, id: z.string().regex(/^[\w-]{8,80}$/), gameId: z.string().min(1).max(64).optional(), experience: z.literal("social").optional() })
      .strict()
      .safeParse(await ludiBody(event));
    if (!body.success) {
      const field = body.error.issues[0]?.path[0];
      throw new LudiError(400, field === "name" ? "Usa um nome entre 1 e 32 caracteres." : field === "gameId" ? "Jogo indisponível." : "Pedido inválido.");
    }
    return ludiRooms.create(token, body.data.name, body.data.id, ludiRequestIp(event), body.data.gameId, body.data.experience);
  }),
);
