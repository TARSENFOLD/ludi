<script setup lang="ts">
defineProps<{ game: string }>()
</script>
<template>
  <svg v-if="game === 'entre-nos'" class="ludi-cover-art art-conversation" viewBox="0 0 440 310" fill="none" aria-hidden="true" focusable="false">
    <path d="M38 241c80 58 247 57 363-7" stroke="currentColor" stroke-width="1" opacity=".25" />
    <g class="art-piece art-piece-one">
      <path d="m48 73 190-17 13 153-49 4-32 39-5-36-103 9Z" fill="#542b3c" />
      <path d="m40 61 190-17 13 153-49 4-32 39-5-36-103 9Z" fill="#fff5de" stroke="#542b3c" stroke-width="2" />
      <path d="m61 81 148-13M65 91l147-13" stroke="#542b3c" opacity=".2" />
      <ellipse cx="112" cy="132" rx="11" ry="17" transform="rotate(-5 112 132)" fill="#542b3c" />
      <ellipse cx="168" cy="127" rx="11" ry="17" transform="rotate(-5 168 127)" fill="#542b3c" />
      <path d="M125 157q19 14 34-3" stroke="#542b3c" stroke-width="3" stroke-linecap="round" />
    </g>
    <g class="art-piece art-piece-two">
      <path d="m242 106 158 29-21 140-81-15-31 27 1-33-50-9Z" fill="#542b3c" />
      <path d="m235 94 158 29-21 140-81-15-31 27 1-33-50-9Z" fill="#ddfa79" stroke="#542b3c" stroke-width="2" />
      <path d="m252 112 120 22m-122-13 120 22" stroke="#542b3c" opacity=".2" />
      <path d="m258 168 22 4m39 7 22 4" stroke="#542b3c" stroke-width="8" stroke-linecap="round" />
      <path d="M280 199q18 20 37 7" stroke="#542b3c" stroke-width="3" stroke-linecap="round" />
    </g>
    <path d="m317 29 4 21 20-7-16 15 16 15-21-7-4 21-5-21-20 7 16-15-16-15 21 7Z" fill="#542b3c" />
    <path d="m19 164 13 7m-8 17 11-4m357-102-11 11m25 4-15 2" stroke="#542b3c" stroke-width="2" stroke-linecap="round" />
  </svg>
  <svg v-else class="ludi-cover-art art-quiz" viewBox="0 0 360 310" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="184" cy="265" rx="142" ry="20" fill="#17217f" opacity=".45" />
    <g class="art-piece art-piece-one" transform="rotate(-13 157 156)">
      <rect x="64" y="41" width="171" height="220" rx="7" fill="#17217f" />
      <rect x="55" y="29" width="171" height="220" rx="7" fill="#fff5de" stroke="#17217f" stroke-width="2" />
      <path d="M72 50h22m-22 8h12m115 162h-22m22-8h-12" stroke="#17217f" stroke-width="2" />
      <path d="M118 93c0-30 51-38 54-6 3 25-31 24-31 48" stroke="#334de4" stroke-width="17" stroke-linecap="round" />
      <circle cx="141" cy="162" r="10" fill="#334de4" />
    </g>
    <g class="art-piece art-piece-two">
      <path d="m232 130 15 13 21-6 4 22 19 11-11 19 6 22-22 5-11 19-19-11-22 6-4-22-20-11 12-19-6-22 22-5Z" fill="#17217f" transform="translate(5 9)" />
      <path d="m232 130 15 13 21-6 4 22 19 11-11 19 6 22-22 5-11 19-19-11-22 6-4-22-20-11 12-19-6-22 22-5Z" fill="#ddfa79" stroke="#17217f" stroke-width="2" />
      <path d="m216 179 15 16 27-30" stroke="#17217f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <path d="m290 45 2 18 18 2-18 3-2 18-3-18-18-3 18-2Zm-249 167 2 12 12 2-12 2-2 12-2-12-12-2 12-2Z" fill="#ddfa79" />
    <path d="m283 103 24-8m-18 22 28 3" stroke="#fff5de" stroke-width="2" stroke-linecap="round" />
  </svg>
</template>
