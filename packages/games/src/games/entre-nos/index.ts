/** A short Ludi duo game composed entirely from existing Doot blocks. */
import { defineGame } from '@doot-games/sdk'
import { guessBlock } from '../../blocks/guess/block'
import { pollBlock } from '../../blocks/poll/block'
import EntreNosResults from './EntreNosResults.vue'

import { entreNosContent as rounds } from '../../ludi/content/entre-nos.server'

export const entreNos = defineGame({
  manifest: {
    id: 'entre-nos',
    name: 'Entre Nós',
    version: '0.1.0',
    description: 'Quatro rondas para descobrir, conversar e rir a dois.',
    author: 'Ludi',
    capabilities: [],
    minPlayers: 2,
  },
  blocks: [pollBlock, guessBlock],
  components: { Results: EntreNosResults },
  defaultConfig: { title: 'Entre Nós', rounds },
})
