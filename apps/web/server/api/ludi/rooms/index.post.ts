import { z, participantNameSchema } from "@doot-games/sdk/ludi";
import { LudiError } from "@doot-games/games/ludi/controller";
import { ludiRooms } from "../../../utils/ludi-rooms";
import { ludiApi, ludiBody, ludiRequest, ludiRequestIp } from "../../../utils/ludi-http";
export default defineEventHandler((event) =>
  ludiApi(async () => {
    const token = ludiRequest(event, true, true);
    const body = z
      .object({ name: participantNameSchema, id: z.string().regex(/^[\w-]{8,80}$/) })
      .strict()
      .safeParse(await ludiBody(event));
    if (!body.success) throw new LudiError(400, "Usa um nome entre 1 e 32 caracteres.");
    return ludiRooms.create(token, body.data.name, body.data.id, ludiRequestIp(event));
  }),
);
