<script setup lang="ts">
// Decorative, code-native artwork. Visible labels carry the meaning.
defineProps<{ scene: 'brand' | 'rest' | 'explore' }>()
</script>
<template>
  <svg class="entre-art" viewBox="0 0 180 116" fill="none" aria-hidden="true" focusable="false">
    <g v-if="scene === 'brand'">
      <path d="M20 51C20 25 44 10 73 10s49 17 49 42-23 40-51 40H43L24 105l5-27c-6-7-9-16-9-27Z" fill="#17513c" />
      <path d="M85 70c0-22 19-37 43-37s43 15 43 37c0 10-5 20-13 27l3 16-20-9h-13c-24 0-43-13-43-34Z" fill="#bbd9b4" stroke="#faf9f6" stroke-width="4" />
      <path d="M48 47c0 10 12 10 12 0M79 43c0 10 12 10 12 0" stroke="#f7f4e7" stroke-width="5" stroke-linecap="round" />
      <ellipse cx="116" cy="67" rx="3" ry="4" fill="#17513c" /><ellipse cx="143" cy="67" rx="3" ry="4" fill="#17513c" />
      <path d="M123 78c4 6 10 6 14 0" stroke="#17513c" stroke-width="3.5" stroke-linecap="round" />
      <path d="m132 19 2-12m14 18 9-9m1 21 13-1" stroke="#edb938" stroke-width="6" stroke-linecap="round" />
    </g>
    <g v-else-if="scene === 'rest'">
      <ellipse cx="88" cy="104" rx="76" ry="7" fill="#dfdfcd" />
      <path d="M37 60V38c0-18 13-25 35-25s35 7 35 25v40H37Z" fill="#31785a" />
      <path d="M46 51V37c0-10 8-16 21-18M93 23c5 5 7 12 7 20v22" stroke="#4a8b65" stroke-width="5" stroke-linecap="round" />
      <rect x="31" y="61" width="83" height="40" rx="15" fill="#4c936c" />
      <rect x="21" y="49" width="26" height="52" rx="12" fill="#82b480" />
      <rect x="99" y="49" width="26" height="52" rx="12" fill="#82b480" />
      <path d="M45 78h51" stroke="#2b6f52" stroke-width="3" stroke-linecap="round" />
      <path d="m57 40 33 3-3 26-32-2Z" fill="#efd797" /><path d="m63 45 17 3" stroke="#f8e7b9" stroke-width="3" stroke-linecap="round" />
      <path d="M32 101v5m79-5v5" stroke="#385d42" stroke-width="5" stroke-linecap="round" />
      <path d="M138 81v25m-11-24h34" stroke="#ba996a" stroke-width="5" stroke-linecap="round" />
      <path d="M131 62h22v9c0 14-22 14-22 0Z" fill="#b77d4a" /><path d="M154 64h5c8 0 8 11 0 11h-6" stroke="#b77d4a" stroke-width="3" />
      <path d="M139 55c-7-8 6-10 0-19m9 19c-6-7 5-8 0-15" stroke="#d7b88d" stroke-width="3" stroke-linecap="round" />
    </g>
    <g v-else>
      <circle cx="138" cy="22" r="14" fill="#f0be43" />
      <path d="m18 83 49-69c4-6 10-6 14 0l48 69Z" fill="#85bca3" /><path d="m64 23 9-12 12 17-10-5-6 9Z" fill="#c3ded1" />
      <path d="m77 83 29-44c3-5 8-5 12 0l34 47Z" fill="#4e9272" />
      <path d="M7 85c30-14 64-14 87-5 19-18 46-17 80 0v22H7Z" fill="#a4c693" />
      <path d="M82 77c55 10-12 19 5 32h43c-42-17 17-18-35-32Z" fill="#ecd398" />
      <path d="M28 88V49m27 46V38m92 57V55" stroke="#26563f" stroke-width="5" stroke-linecap="round" />
      <path d="m28 36-18 39h36Zm27-15L32 72h47Zm92 18-20 44h40Z" fill="#296e4d" />
      <path d="m55 26-13 40h13Zm92 18-10 32h10Z" fill="#3d8058" />
      <path d="m17 96 5-4m133 9 6-4" stroke="#739e72" stroke-width="3" stroke-linecap="round" />
    </g>
  </svg>
</template>
<style scoped>
.entre-art { display: block; width: 100%; height: auto; }
</style>
