# Preparação da primeira publicação do Ludi

Estado em 10 out 2026: preparação para a VPS Hetzner existente, partilhada com PDC. Domínio aprovado: **ludi.usepdc.com**. O utilizador adiou a criação do DNS e a abertura pública. Base integrada: `954796d` (v0.2, PR #1). Este documento não representa um serviço publicado.

## Infraestrutura existente verificada

Inspeção apenas de leitura por SSH em 10 out 2026:

- Host x86-64, Docker e Docker Compose disponíveis.
- Serviços atuais: `pdc-api`, `pdc-strapi`, `pdc-redis` e `pdc-traefik`.
- Traefik `v3.7.0` já ocupa 80/443, com entrypoint `websecure`, resolver ACME `letsencrypt` e provider Docker com exposição por defeito desativada.
- Rede Docker atual: `pdc-prod_pdc-network`. Serviços PDC sob `/opt/pdc`.
- Na inspeção, aproximadamente 2,2 GiB de RAM disponíveis e 14 GB de disco livres. São valores pontuais; não representam garantia de capacidade sob carga.

Preparar um projeto Compose separado `ludi`, diretório `/opt/ludi` e nomes de routers/services exclusivos. Aproveitar o Traefik existente; não instalar outro proxy nas portas 80/443. Antes da publicação, definir a ligação de rede mínima necessária ao proxy e rever o isolamento dos restantes serviços. Fazer builds fora da VPS para evitar competir com PDC por memória. IP e detalhes de acesso ficam no contexto operacional privado, fora deste repositório público.

## Configuração necessária

- Executar o servidor Nitro compilado num processo Node 22, numa única instância. As salas ficam em memória até oito horas; reiniciar ou substituir o processo termina as partidas.
- Manter o serviço ativo durante as partidas. Autoscaling e suspensão automática não são compatíveis com a persistência em memória desta versão.
- Construir a partir da raiz do monorepo: `corepack pnpm install --frozen-lockfile` e `corepack pnpm --filter @doot-games/web build`.
- Iniciar com `node apps/web/.output/server/index.mjs`, `NODE_ENV=production`, `HOST=0.0.0.0` e a porta fornecida pelo alojamento.
- Configurar `LUDI_PUBLIC_ORIGIN` com a origem HTTPS exata, sem caminho ou barra final; configurar também `PUBLIC_BASE_URL` e `NUXT_PUBLIC_BASE_URL` para os componentes legados.
- Gerar `SESSION_PASSWORD` aleatória (pelo menos 32 caracteres), guardada nos segredos do alojamento. A aplicação ainda inicializa a autenticação legada.
- Suportar streaming SSE em `/api/ludi/rooms/*/events`, sem buffering/cache e com timeout compatível com ligações prolongadas. O servidor emite heartbeat a cada 15 segundos.
- Usar `/api/health` como liveness. Este endpoint não substitui a prova de criar, entrar, responder e reconectar numa sala.

## Configuração preparada nesta branch

- `docker/docker-compose.ludi.yml`: projeto separado, sem porta de aplicação publicada, ligação à rede do proxy, volume próprio, limite de 768 MiB/1 CPU, rotação de logs e labels exclusivas do Traefik. Estes limites são iniciais e precisam de validação com carga real.
- `docker/ludi.env.example`: variáveis para `/opt/ludi/.env`, sem credenciais reais.
- `LUDI_PUBLIC_ONLY=1`: allowlist no servidor para páginas Ludi, assets e API de salas. `/` e convites antigos encaminham para Ludi. Contas/admin/MCP/uploads/APIs legadas recebem 404, incluindo pedidos diretos. O código legado continua disponível nas instalações sem este perfil.
- `NUXT_PUBLIC_LUDI_PUBLIC_ONLY=true`: navegação/metadados públicos Ludi e sem inicialização da sessão de conta ou reporte ao endpoint legado. Configurar ambas as flags.
- `LUDI_TRUSTED_PROXY_IP`: confiança apenas no IP exato da ligação direta do Traefik. Usa o último IP válido acrescentado a X-Forwarded-For; ignora headers enviados por ligações diretas não confiáveis. O mesmo IP é usado para limites HTTP e de criação de salas. Se o Traefik for recriado com outro IP, atualizar a variável e recriar apenas o serviço Ludi.

## Herança e decisões operacionais

1. **Configuração de publicação própria.** `docker/docker-compose.deploy.yml` usa a imagem `ghcr.io/virgilvox/doot-games:latest`; `docs/deploy.md` e Caddy descrevem o alojamento original do Doot. Preparar imagem deste repositório e Compose separado com integração no Traefik existente. Esses ficheiros legados não são instruções prontas para publicar o Ludi.
2. **Contas e administração legadas.** `ensureFirstAdmin()` em `apps/web/server/utils/admin-repo.ts` promove a primeira conta real criada. O perfil público agora impede acesso à API de criação de contas e administração. Não desativar esse perfil nem importar uma base de contas existente sem uma revisão específica do provisionamento.
3. **Entrada pública.** A raiz encaminha para `/ludi`; a navegação pública omite o catálogo legado. A restrição efetiva é aplicada no servidor.
4. **Proxy e limites.** O DNS inicial deve ficar sem proxy Cloudflare (DNS only), para Traefik receber diretamente o cliente. Ativar outro proxy requer rever a cadeia de confiança; não reutilizar um header externo sem validação. A rede partilhada permite conectividade entre contentores; apenas o peer Traefik explicitamente configurado é confiável para headers.
5. **Dados legados.** O processo inicializa SQLite/autenticação mesmo que os jogos Ludi não usem contas. Definir armazenamento e política de acesso desse legado. Um volume para SQLite não torna as salas Ludi persistentes.

## Provas antes de partilhar o endereço

Verificação local desta preparação: 232 testes em 27 ficheiros passaram; typecheck de todos os pacotes e build Nuxt/Nitro passaram; Compose validado com `config --quiet`. A prova contra o build passou com o perfil público ativo: redirecionamento da raiz, ausência do link legado, bloqueio de APIs legadas em GET/POST, quatro rondas, SSE, retoma, replay e inspeção de 64 assets sem conteúdo das salas. HTTPS e streaming através do Traefik real continuam por validar após o DNS/publicação.

- Build e arranque no ambiente escolhido; healthcheck bem-sucedido.
- Cookie anónimo `HttpOnly`, `SameSite=Lax` e `Secure` na origem pública HTTPS; pedidos de escrita de outra origem recusados.
- Duas sessões independentes: quatro rondas de Entre Nós, filtragem de respostas/soluções, recarga dos dois participantes e repetição sem pontuação herdada.
- SSE através do proxy real: atualizações entregues sem buffering e retoma após interrupção de rede.
- Tentativa externa de criar conta/assumir administração bloqueada pelo perfil ou provisionamento definido.
- Desafio rápido em solo e no mesmo aparelho; carregamento inicial público seguido de jogo sem rede.
- Reinício controlado em sala de teste: mensagem explícita de sala terminada. Fazer esta prova antes de convidar utilizadores.

## Retomar a publicação

1. Criar o registo A `ludi` na zona `usepdc.com` para o IP da VPS já identificado, DNS only. A edição foi adiada pelo utilizador. A sessão Wrangler local não tem scope de escrita DNS; o painel de browser não estava acessível ao agente.
2. Rever/integrar esta branch e compilar uma imagem identificada pelo commit, fora da VPS: `docker build -f docker/Dockerfile -t ludi:<commit> .`. O build Docker inicial foi interrompido durante o download da base quando a publicação foi adiada; não é evidência de imagem validada.
3. Transferir a imagem com `docker save`/`docker load`, sem substituir imagens PDC. Preparar `/opt/ludi` e copiar apenas o Compose Ludi. Criar `.env` com modo 600 e segredo aleatório; obter o IP atual do proxy com o comando indicado no exemplo.
4. Validar com `docker compose --env-file /opt/ludi/.env -f /opt/ludi/docker-compose.ludi.yml config --quiet`. Não imprimir a configuração expandida porque contém o segredo.
5. Arrancar apenas o projeto `ludi` com `up -d --wait`. Verificar certificado HTTPS e todas as provas acima. Verificar também os healthchecks PDC antes/depois.
6. Em falha, parar/remover apenas o projeto Ludi, preservando o volume; manter a imagem anterior para rollback. Não usar comandos de limpeza global ou alterar a stack PDC.

Reiniciar/atualizar Ludi invalida salas ativas nesta versão. O volume SQLite preserva apenas estado legado; não é backup das partidas. Não criar uma nova VPS ou conta de alojamento.
