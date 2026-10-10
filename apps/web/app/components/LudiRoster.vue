<script setup lang="ts">
import type { Participant } from '@doot-games/sdk/ludi'
defineProps<{ players: Participant[]; me?: string; waiting?: boolean }>()
</script>
<template>
  <ul class="ludi-roster" aria-label="Participantes">
    <li v-for="player in players" :key="player.id">
      <span class="ludi-avatar" aria-hidden="true">{{ [...player.name][0]?.toLocaleUpperCase('pt-PT') }}</span>
      <span class="ludi-roster-name">{{ player.name }}<small v-if="player.id === me" class="ludi-roster-note">Tu</small></span>
    </li>
    <li v-if="waiting" class="ludi-roster-empty"><span class="ludi-avatar" aria-hidden="true">+</span><span>Um lugar à espera.</span></li>
  </ul>
</template>
