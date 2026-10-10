<script setup lang="ts">
if (!useRuntimeConfig().public.ludiOndaPreview) throw createError({ statusCode: 404, statusMessage: 'Jogo em validação' })
</script>
<template><LudiCreateRoom game-id="na-mesma-onda" /></template>
