/** Server-only content bundle. Never re-export through the public games catalogue. */
import type { RoundInstance } from "@doot-games/sdk";
export const entreNosContent: RoundInstance[] = [
  {
    block: "poll",
    content: {
      prompt: "Temos cinco minutos livres. Qual é o melhor plano?",
      image: "",
      timer: null,
      options: [
        { label: "Inventar uma viagem impossível" },
        { label: "Contar uma história embaraçosa" },
      ],
    },
  },
  {
    block: "guess",
    content: {
      subject: "Desafio rápido",
      prompt: "Numa corrida, ultrapassas quem está em segundo lugar. Em que lugar ficas?",
      image: "",
      audio: "",
      timer: null,
      options: [{ label: "Primeiro" }, { label: "Segundo" }, { label: "Terceiro" }],
      correct: 1,
    },
  },
  {
    block: "poll",
    content: {
      prompt: "Se hoje tivesse uma banda sonora, qual seria?",
      image: "",
      timer: null,
      options: [
        { label: "Comédia inesperada" },
        { label: "Aventura épica" },
        { label: "Jazz tranquilo" },
      ],
    },
  },
  {
    block: "guess",
    content: {
      subject: "Último desafio",
      prompt: "O que pesa mais: um quilo de algodão ou um quilo de ferro?",
      image: "",
      audio: "",
      timer: null,
      options: [{ label: "Algodão" }, { label: "Ferro" }, { label: "Pesam o mesmo" }],
      correct: 2,
    },
  },
];
