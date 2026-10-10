import { ludiRooms } from "../utils/ludi-rooms";
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("close", () => ludiRooms.dispose());
});
