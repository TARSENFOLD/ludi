import { ludiRooms } from '../../../../utils/ludi-rooms';
import { ludiApi, ludiBody, ludiRequest } from '../../../../utils/ludi-http';
export default defineEventHandler(event => ludiApi(async () => {
  const token = ludiRequest(event, true);
  return ludiRooms.prepare(getRouterParam(event, 'code') ?? '', token, await ludiBody(event));
}));
