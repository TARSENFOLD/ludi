/** Doot view adapter; Ludi also uses these headless rules. */
import { defineBlock } from '@doot-games/sdk'
import { guessRules } from './rules'
import GuessHost from './GuessHost.vue'
import GuessPlayer from './GuessPlayer.vue'
import GuessReveal from './GuessReveal.vue'
export * from './rules'
export const guessBlock = defineBlock({ ...guessRules, HostDisplay: GuessHost, PlayerInput: GuessPlayer, PlayerReveal: GuessReveal })
