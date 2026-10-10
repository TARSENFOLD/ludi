import { ludiRooms } from "../../../../utils/ludi-rooms";
import { ludiApi, ludiRequest } from "../../../../utils/ludi-http";
export default defineEventHandler((event) =>
  ludiApi(() => ludiRooms.view(getRouterParam(event, "code") ?? "", ludiRequest(event))),
);
