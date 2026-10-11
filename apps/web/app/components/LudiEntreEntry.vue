<script setup lang="ts">
import '../assets/ludi.css'
const beginning = ref(false)
useHead({ title: 'Entre Nós · Ludi', htmlAttrs: { lang: 'pt-PT' } })
</script>
<template>
  <LudiCreateRoom v-if="beginning" game-id="entre-nos" experience="social" />
  <main v-else class="ludi-page">
    <LudiHeader context="Entre Nós" />
    <section class="ludi-narrow ludi-setup">
      <div class="ludi-form-heading"><LudiGameMark game="entre-nos" /><p class="ludi-eyebrow">Conversa e descoberta</p><h1>Entre Nós</h1><p class="ludi-lead">Descobre o que ainda não sabes sobre quem está contigo.</p></div>
      <button class="ludi-primary" @click="beginning = true">Começar <span aria-hidden="true">→</span></button>
      <p class="ludi-small">2–6 pessoas · cerca de 10–15 min · sem conta</p>
      <details class="ludi-form-details"><summary>Como funciona</summary><ol><li>Cria a sala e convida quem vai jogar.</li><li>Escolhe o contexto. Respondam, prevejam e descubram; as respostas ficam secretas até à revelação.</li><li>Conversem. Podem acrescentar perguntas vossas e passar sem explicar.</li></ol></details>
      <p class="ludi-small">O jogo pergunta aquilo que talvez vocês não perguntariam.</p>
    </section>
  </main>
</template>
