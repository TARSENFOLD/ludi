/** Doot view adapter; Ludi also uses these headless rules. */
import { defineBlock } from '@doot-games/sdk'
import { pollRules } from './rules'
import PollHost from './PollHost.vue'
import PollPlayer from './PollPlayer.vue'
import PollReveal from './PollReveal.vue'
export * from './rules'
export const pollBlock = defineBlock({ ...pollRules, HostDisplay: PollHost, PlayerInput: PollPlayer, PlayerReveal: PollReveal })
