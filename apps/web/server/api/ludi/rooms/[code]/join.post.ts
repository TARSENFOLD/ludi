import { z, participantNameSchema } from "@doot-games/sdk/ludi";
import { LudiError } from "@doot-games/games/ludi/controller";
import { ludiRooms } from "../../../../utils/ludi-rooms";
import { ludiApi, ludiBody, ludiRequest } from "../../../../utils/ludi-http";
export default defineEventHandler((event) =>
  ludiApi(async () => {
    const token = ludiRequest(event, true);
    const body = z
      .object({ seenQuestionIds: z.array(z.string().regex(/^en-(choice|story|social)-\d{3}$/)).max(200).optional(), name: participantNameSchema })
      .strict()
      .safeParse(await ludiBody(event));
    if (!body.success) throw new LudiError(400, "Usa um nome entre 1 e 32 caracteres.");
    return ludiRooms.join(getRouterParam(event, "code") ?? "", token, body.data.name, body.data.seenQuestionIds);
  }),
);
