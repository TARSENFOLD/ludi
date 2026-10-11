# Publicação e operação do Ludi

Publicado em **https://ludi.usepdc.com** em 10 out 2026, na VPS Hetzner existente, partilhada com PDC. Após o adiamento inicial, o utilizador retomou a publicação e disponibilizou o painel Cloudflare. Fundação integrada no PR #1; perfil público e Compose integrados no PR #2 (`585cd6d`). Interface atual integrada no PR #4; Na Mesma Onda integrado no PR #5 e publicado em 11 out 2026. Imagem em execução: `ludi:2189d519c1e1294468d4c021cc03b02da7d843eb`.

## Infraestrutura existente verificada

Infraestrutura verificada por SSH em 10 out 2026:

- Host x86-64, Docker e Docker Compose disponíveis.
- Serviços atuais: `pdc-api`, `pdc-strapi`, `pdc-redis` e `pdc-traefik`.
- Traefik `v3.7.0` já ocupa 80/443, com entrypoint `websecure`, resolver ACME `letsencrypt` e provider Docker com exposição por defeito desativada.
- Rede Docker atual: `pdc-prod_pdc-network`. Serviços PDC sob `/opt/pdc`.
- Na inspeção, aproximadamente 2,2 GiB de RAM disponíveis e 14 GB de disco livres. São valores pontuais; não representam garantia de capacidade sob carga.

Projeto Compose separado `ludi`, diretório `~/ludi` do utilizador de deploy (modo 700), com nomes de routers/services exclusivos. Usa o Traefik existente e a sua rede Docker; não publica portas da aplicação no host. A rede permite conectividade com os restantes contentores, pelo que não equivale a isolamento de rede total. O build é feito no GitHub Actions. IP, credenciais e detalhes de acesso ficam fora deste repositório público.

## Configuração necessária

- Executar o servidor Nitro compilado num processo Node 22, numa única instância. As salas ficam em memória até oito horas; reiniciar ou substituir o processo termina as partidas.
- Manter o serviço ativo durante as partidas. Autoscaling e suspensão automática não são compatíveis com a persistência em memória desta versão.
- Construir a partir da raiz do monorepo: `corepack pnpm install --frozen-lockfile` e `corepack pnpm --filter @doot-games/web build`.
- Iniciar com `node apps/web/.output/server/index.mjs`, `NODE_ENV=production`, `HOST=0.0.0.0` e a porta fornecida pelo alojamento.
- Configurar `LUDI_PUBLIC_ORIGIN` com a origem HTTPS exata, sem caminho ou barra final; configurar também `PUBLIC_BASE_URL` e `NUXT_PUBLIC_BASE_URL` para os componentes legados.
- Gerar `SESSION_PASSWORD` aleatória (pelo menos 32 caracteres), guardada nos segredos do alojamento. A aplicação ainda inicializa a autenticação legada.
- Suportar streaming SSE em `/api/ludi/rooms/*/events`, sem buffering/cache e com timeout compatível com ligações prolongadas. O servidor emite heartbeat a cada 15 segundos.
- Usar `/api/health` como liveness. Este endpoint não substitui a prova de criar, entrar, responder e reconectar numa sala.

## Configuração publicada

- `docker/docker-compose.ludi.yml`: projeto separado, sem porta de aplicação publicada, ligação à rede do proxy, volume próprio, limite de 768 MiB/1 CPU, rotação de logs e labels exclusivas do Traefik. Estes limites são iniciais e precisam de validação com carga real.
- `docker/ludi.env.example`: variáveis para `~/ludi/.env`, sem credenciais reais.
- `LUDI_PUBLIC_ONLY=1`: allowlist no servidor para páginas Ludi, assets e API de salas. `/` e convites antigos encaminham para Ludi. Contas/admin/MCP/uploads/APIs legadas recebem 404, incluindo pedidos diretos. O código legado continua disponível nas instalações sem este perfil.
- `NUXT_PUBLIC_LUDI_PUBLIC_ONLY=true`: navegação/metadados públicos Ludi e sem inicialização da sessão de conta ou reporte ao endpoint legado. Configurar ambas as flags.
- `LUDI_TRUSTED_PROXY_IP`: confiança apenas no IP exato da ligação direta do Traefik. Usa o último IP válido acrescentado a X-Forwarded-For; ignora headers enviados por ligações diretas não confiáveis. O mesmo IP é usado para limites HTTP e de criação de salas. Se o Traefik for recriado com outro IP, atualizar a variável e recriar apenas o serviço Ludi.

## Herança e decisões operacionais

1. **Configuração de publicação própria.** `docker/docker-compose.deploy.yml` usa a imagem `ghcr.io/virgilvox/doot-games:latest`; `docs/deploy.md` e Caddy descrevem o alojamento original do Doot. Preparar imagem deste repositório e Compose separado com integração no Traefik existente. Esses ficheiros legados não são instruções prontas para publicar o Ludi.
2. **Contas e administração legadas.** `ensureFirstAdmin()` em `apps/web/server/utils/admin-repo.ts` promove a primeira conta real criada. O perfil público agora impede acesso à API de criação de contas e administração. Não desativar esse perfil nem importar uma base de contas existente sem uma revisão específica do provisionamento.
3. **Entrada pública.** A raiz encaminha para `/ludi`; a navegação pública omite o catálogo legado. A restrição efetiva é aplicada no servidor.
4. **Proxy e limites.** O DNS inicial deve ficar sem proxy Cloudflare (DNS only), para Traefik receber diretamente o cliente. Ativar outro proxy requer rever a cadeia de confiança; não reutilizar um header externo sem validação. A rede partilhada permite conectividade entre contentores; apenas o peer Traefik explicitamente configurado é confiável para headers.
5. **Dados legados.** O processo inicializa SQLite/autenticação mesmo que os jogos Ludi não usem contas. Definir armazenamento e política de acesso desse legado. Um volume para SQLite não torna as salas Ludi persistentes.

## Evidências da primeira publicação

- [Build verificado no GitHub Actions](https://github.com/TARSENFOLD/ludi/actions/runs/38028758874): 232 testes em 27 ficheiros, typecheck, build Nuxt/Nitro e prova HTTP/SSE/bundles. Foram inspecionados 64 assets sem conteúdo das salas.
- A mesma execução construiu a imagem Docker e verificou arranque, healthcheck, catálogo, criação de sala e bloqueio da administração legada antes de exportar o artefacto.
- Artefacto ZIP transferido diretamente para a VPS e verificado por SHA-256: `df17c3ff01f6301569bd2fb22268fa4df877f7e9bf24a9dd640a4fec35cc646d`.
- DNS A `ludi` criado no Cloudflare em modo **DNS only**, TTL automático. Certificado emitido pelo resolver Let's Encrypt do Traefik; HTTPS validado sem ignorar erros de certificado.
- Prova contra a origem pública: raiz/catálogo, APIs legadas bloqueadas em GET/POST, cookies HttpOnly/SameSite=Lax/**Secure**, origem inválida recusada, quatro rondas com duas sessões, visões filtradas, SSE real, retoma por snapshot, identidade, entrada concorrente, repetição idempotente e limite do corpo passaram.
- Browser na origem pública: catálogo carregou e Desafio rápido solo foi concluído, cinco perguntas e cinco pontos. A validação local sem rede e o teste físico no iPhone da v0.2 estão registados na entrega anterior; não são apresentados como novos testes físicos da publicação.

- Reinício controlado apenas do Ludi: contentor voltou a saudável e sala anterior passou a responder HTTP 410 (tratado pela interface como sala terminada). Os quatro contentores PDC mantiveram-se saudáveis; não foram reiniciados.

## Publicação da direção visual — 10 out 2026

- PR #4 integrada em `5696418032ac00a208338ce3e0a784ecc39dd9fe`, após autorização de publicação.
- [Release CI](https://github.com/TARSENFOLD/ludi/actions/runs/38034219799): verificação completa e imagem aprovadas. Artefacto ZIP verificado no destino: SHA-256 `b49571d971a76dbd5d9fa1892410a6eaf22ef61484fe1969fc6d8ff993fb2839`.
- Apenas o serviço Ludi foi recriado; ficou saudável. Imagem anterior conservada para recuperação. Serviços PDC mantiveram o uptime e healthchecks.
- HTTPS e nova homepage editorial verificados no browser público. Preparação do quiz, início, primeira resposta e pontuação (+1) confirmados.
- Prova HTTP/SSE contra a origem pública aprovada: quatro rondas, cookies Secure/HttpOnly, origem, identidade, retoma, filtragem, idempotência, entrada concorrente e limites.
- A QA responsive documentada continua válida; esta publicação não constitui um novo teste físico no iPhone.

## Publicação de Na Mesma Onda — 11 out 2026

- [PR #5](https://github.com/TARSENFOLD/ludi/pull/5) integrado em `2189d519c1e1294468d4c021cc03b02da7d843eb`, após aceitação física do utilizador no iPhone e outro aparelho.
- [Release CI](https://github.com/TARSENFOLD/ludi/actions/runs/38038341513): check e image aprovados. ZIP verificado no destino: SHA-256 `df3991659dd59a017cd999f0f92bce2023e2102e22fc44dca3b477ef0ed68afe`.
- Apenas Ludi foi recriado e ficou saudável. Imagem anterior `5696418032ac00a208338ce3e0a784ecc39dd9fe` conservada para rollback. Os quatro serviços PDC mantiveram os instantes de arranque e healthchecks.
- HTTPS, catálogo público e bloqueio das APIs legadas verificados. Entre Nós passou quatro rondas; Na Mesma Onda passou seis rondas com 2 e 6 sessões independentes, retoma, privacidade HTTP/SSE, identidade, inputs e revanche idempotente. Cookies Secure/HttpOnly verificados.
- O teste físico passou antes do deploy. Esta publicação não reivindica um novo teste físico nem QA visual automatizada.

## Atualizar ou recuperar o serviço

1. Integrar o código revisto e executar `gh workflow run ludi.yml --repo TARSENFOLD/ludi --ref main -f build_image=true`. Aguardar sucesso de **check e image**. O build não acontece na VPS.
2. Obter o artefacto `ludi-image-<SHA completo>` dessa execução, verificar o digest do ZIP e extrair apenas `ludi-image.tar.gz`. Os artefactos do Actions expiram ao fim de sete dias; conservar a imagem atual e a anterior na VPS. Não guardar tokens ou URLs assinados no repositório/logs.
3. Usar `docker load -i ~/ludi/ludi-image.tar.gz`. Atualizar apenas `LUDI_IMAGE` no `~/ludi/.env` (modo 600), preservando o segredo. Obter novamente o IP do peer Traefik se este tiver sido recriado.
4. Validar com `docker compose --env-file ~/ludi/.env -f ~/ludi/docker-compose.ludi.yml config --quiet`. Não imprimir a configuração expandida porque contém o segredo.
5. Executar `docker compose --env-file ~/ludi/.env -f ~/ludi/docker-compose.ludi.yml up -d --wait`. Verificar HTTPS, criação/entrada numa sala e SSE, além dos healthchecks PDC antes/depois.
6. Em falha, restaurar o tag anterior em `LUDI_IMAGE` e repetir `up -d --wait`. Na primeira publicação, sem versão anterior, parar apenas o projeto Ludi. Preservar o volume. Não usar limpezas globais ou alterar a stack PDC.

Reiniciar/atualizar Ludi invalida salas ativas nesta versão. O volume SQLite preserva apenas estado legado; não é backup das partidas. As salas duram no máximo oito horas; esta entrega usa uma única instância e não tem persistência durável. Não criar uma nova VPS ou conta de alojamento.
