# ROADMAP — Loopin

Planejamento das próximas fases do app. Cada fase é entregue com **testes**, `tsc`, lint e commits pequenos (um por item).

---

## Fase 1 — Base de qualidade e correção de bugs (concluída)

Objetivo: montar a base de qualidade (testes, lint, CI) e corrigir os 10 bugs abaixo **sem alterar o visual nem os textos** (exceto o plural "missãoões").

### Bugs

| # | Bug | Local | Impacto |
|---|-----|-------|---------|
| 1 | Editar a dificuldade de uma missão já concluída muda o `xpReward` sem ajustar o `totalXp`. Dá para concluir uma missão Épica, mudar para Fácil, desmarcar e ficar com +90 XP de graça. | `GameContext.tsx:70-85` | XP corrompido |
| 2 | Streak não é revertido ao desmarcar. Concluir e desmarcar mantém o streak e o `lastCompletionDate`. | `GameContext.tsx:104-140` | Streak fraudável |
| 3 | Streak exibido fica desatualizado. Se você passa 3 dias sem jogar, a Home continua mostrando o número antigo até a próxima conclusão. | `index.tsx:77` | Informação errada |
| 4 | "Bônus de constância" do README não existe. O código só soma o `xpReward`, sem bônus de streak. | `README vs reducer` | Promessa não cumprida |
| 5 | O app não percebe a virada do dia. O `dateKey()` fica dentro de um `useMemo` que só recalcula quando o estado muda. Se o app ficar aberto após a meia-noite, "hoje" fica errado. | `GameContext.tsx:244` | Dados do dia errados |
| 6 | Level-up repete ao desmarcar e marcar de novo. Excluir ou desmarcar também faz o nível cair em silêncio. | `GameContext.tsx:214-226` | Celebração farmável |
| 7 | Texto "missãoões". O sufixo `'ões'` é concatenado a "missão". | `missoes.tsx:87` | Bug visível |
| 8 | `Alert.alert` com botões não funciona no web (`react-native-web`). O projeto tem script web, então excluir missão falha ali. | `missoes.tsx:64, index.tsx:39` | Só afeta web |
| 9 | Flash do estado inicial. `hydrated` existe mas ninguém o usa, então aparece "Herói / 0 XP" por um instante antes de carregar. | `_layout.tsx` | Polimento |
| 10 | `loadState` só valida `quests`. Se `stats` faltar ou o formato mudar, o app quebra. Não há versionamento nem migração. | `storage.ts:13` | Risco em atualizações |

### Base de qualidade

- **Testes**: `jest-expo` + `@testing-library/react-native`; script `npm test`.
- **Lint**: `eslint-config-expo`; script `npm run lint` (além de `npx expo lint`).
- **CI**: GitHub Actions rodando `tsc --noEmit`, `expo lint` e `npm test`.

### Decisões de arquitetura

- **Totais derivados**: `totalXp` e `completedQuests` deixam de ser armazenados e passam a ser **derivados** de um log de conclusões `completions: { id, questId, xp, at }[]`.
- **Streak derivado**: a sequência (atual e recorde) é calculada a partir do log + a data atual — nunca guardada.
- **`schemaVersion = 2`** com migração `v1 → v2` que reconstrói o log a partir das missões já concluídas, **sem perder XP**.
- **Reducer puro**: `id` e data entram pela action; nunca são gerados dentro do reducer.
- **`hydrated`** segura a splash; **`AppState`** recalcula "hoje" ao voltar para o app ou na virada do dia.

### Critérios de aceite

- `npx tsc --noEmit`, `npx expo lint` e `npm test` passam sem erros.
- Editar a dificuldade de uma missão concluída **não** altera o XP total.
- Concluir e desmarcar a mesma missão **não** altera streak nem nível.
- O streak exibido volta a **0** se ontem não houve conclusão e hoje também não.
- Um estado **v1 salvo é migrado sem perda de XP**.

---

## Fase 2 — Recorrências, notificações, feedback e backup (concluída)

- ✅ **Missões recorrentes**: novo modelo `QuestTemplate` (título, categoria, dificuldade, recorrência diária / dias da semana / semanal, ativo, última data gerada) com geração **idempotente** (abrir o app duas vezes no mesmo dia não duplica; dias perdidos não geram retroativos) e tela para criar, editar e pausar.
- **Notificações locais** (`expo-notifications`): ✅ lembrete diário configurável e aviso de streak em risco, pedindo permissão no momento certo (não no boot).
- **Feedback de conclusão**: ✅ haptics, "+XP" animado e toast com "Desfazer", respeitando "reduzir movimento" do sistema.
- ✅ **Backup**: exportar e importar em JSON, com validação e confirmação antes de sobrescrever.

---

## Fase 3 — Atributos, economia, streak e épicas (concluída)

Entregue em **PRs separados**, um por item, com `tsc`, lint, testes e CI verdes. Cada item tem uma mini-spec (modelo de dados, fórmulas/balanceamento e impacto na migração) na descrição do respectivo PR.

| # | Item | Status |
|---|------|--------|
| a | Atributos por categoria com nível próprio | ✅ |
| b | Ouro e loja de recompensas personalizadas | ✅ |
| c | Escudo de streak e bônus de XP por sequência | ✅ |
| d | Missões épicas com subtarefas | ✅ |
| e | Novas conquistas com data e toast | ✅ |

### (a) Atributos por categoria — decisões

- **Modelo**: `Completion` passa a guardar `category` **congelada na conclusão** (junto do `xp`) — editar categoria/dificuldade depois não move atributo. `schemaVersion` 4 → 5.
- **Fórmula**: mesma curva do nível global (`50 * (L − 1)²`), aplicada só ao XP da categoria. Invariante: se todo o XP fosse de uma categoria, o atributo teria o nível global; atributo nunca passa o global.
- **Balanceamento** (175 XP/dia: 1 épica + 1 difícil + 1 média; Saúde 30% · Trabalho 25% · Estudo 15% · Finanças 10% · Outros 10% · Lazer 5% · Social 5%): níveis **3–6 em 30 dias** e **4–10 em 90 dias**, contra **11** e **18** do nível global.
- **Migração v4 → v5**: backfill da categoria pela missão de origem (`questId` inexistente cai em `outros`). Sem perda de XP; backups antigos migram no import.
- **Derivado** em `src/domain/attributes.ts` — o único dado novo persistido é a categoria dentro do log de conclusões.

### (b) Ouro e loja de recompensas — decisões

- **Modelo**: `Completion` ganha `gold` **congelado na conclusão** (mesmo princípio do `xp` e da `category`); `AppState` ganha `rewards: Reward[]` e `purchases: Purchase[]`. O resgate guarda um **snapshot** de título e preço, então editar/excluir a recompensa não reescreve o histórico nem devolve ouro. `schemaVersion` 5 → 6.
- **Fórmula**: `goldFromXp(xp) = round(xp / 5)` — fácil 2 · média 5 · difícil 10 · épica 20. `saldo = max(0, Σ gold − Σ custoDosResgates)`.
- **Balanceamento** (175 XP/dia = 100 + 50 + 25): **35 de ouro/dia** — 1.050 em 30 dias, 3.150 em 90 dias. Ancoragem de preços: 25 ≈ 0,7 dia · 100 ≈ 2,9 dias · 250 ≈ 7,1 dias · 500 ≈ 14,3 dias.
- **Invariante**: o saldo é derivado do log + dos resgates (nunca persistido) e o resgate sem saldo é bloqueado **no reducer** (não só na UI).
- **Migração v5 → v6**: backfill de `gold` a partir do `xp` (`round(xp/5)`); `rewards`/`purchases` ausentes viram `[]`; entradas inválidas (título vazio, preço ≤ 0, resgate sem data) são descartadas na validação. Backups antigos migram no import.
- **UI**: modal `loja` (saldo, recompensas ordenadas por preço e histórico de resgates) e modal `nova-recompensa`; atalhos na pílula de ouro do cartão do herói e em Editar perfil. O feedback de conclusão passou a mostrar o ouro ganho.

### (c) Escudo de streak e bônus de XP por sequência — decisões

- **Modelo**: `Completion` ganha `bonusXp` (detalhamento **congelado** do bônus de sequência) e `Purchase` ganha `kind: 'reward' | 'shield'`. Nada mais é persistido: os escudos e os dias protegidos são **derivados** do histórico. `schemaVersion` 6 → 7.
- **Bônus de XP**: `bonusXp = round(xpReward × pct / 100)`, com `pct` por degraus de sequência — 1–2 dias 0% · 3–6 **+10%** · 7–13 **+20%** · 14–29 **+30%** · 30+ **+50%**. Vale a sequência que o jogador passa a ter ao concluir hoje (todos os resgates do dia usam o mesmo percentual) e `xp = xpReward + bonusXp`.
- **O bônus é XP, não ouro**: conta para nível e atributos, mas o ouro continua `round(xpReward / 5)`. Isso preserva exatamente o balanceamento do item (b) (35/dia). Se o bônus virasse ouro, seriam 1.301 / 4.457 (+24% / +41%).
- **Balanceamento do bônus** (175 XP/dia, concluindo todo dia): 175 → 193 (+10%) → 210 (+20%) → 228 (+30%) → **263 XP/dia** (+50%). Acumulado: **5.250 → 6.503 XP em 30 dias** (nível 11 → **12**) e **15.750 → 22.283 XP em 90 dias** (nível 18 → **22**) — o bônus responde por 19% e 29% do XP.
- **Escudo de sequência**: comprado com ouro na loja por **100** (≈ 2,9 dias de ganho, a mesma âncora "média" do item b), no máximo **3** em reserva. Cobre **um dia passado sem conclusão**, mantendo a sequência viva. Sequência passa a ser `dias com conclusão ∪ dias com escudo`.
- **Consumo determinístico e prospectivo**: `shieldProtectedDays` anda dia a dia da primeira conclusão até **ontem** (hoje nunca é protegido — o dia ainda não acabou); cada dia sem conclusão com sequência viva e escudo já comprado é coberto, um escudo por dia. A compra vale **do dia da compra em diante**, então não dá para comprar depois para consertar um buraco antigo. Nada é gravado: o mesmo histórico e o mesmo `today` devolvem sempre o mesmo resultado.
- **Migração v6 → v7**: `bonusXp` ausente vira `0` (nada de bônus retroativo) e `kind` ausente vira `'reward'` (nenhum resgate antigo vira escudo). Sem perda de XP ou ouro; backups antigos migram no import.
- **UI**: a pílula de sequência do cartão do herói ganha os atalhos `+N% de XP` e `N escudos`; a aba Progresso ganha um cartão de **Sequência** (bônus atual, próximo degrau e escudos em reserva/usados); a loja ganha o cartão **Escudo de sequência**; o toast de conclusão mostra o bônus.

### (d) Missões épicas com subtarefas — decisões

- **Modelo**: `Quest` ganha `subtasks: Subtask[]` (`{ id, title, done }`), sempre presente (vazio quando não há passos); `QuestInput` ganha `subtasks?: string[]` (títulos vindos do formulário). `schemaVersion` 7 → 8.
- **Regra**: missão com passos **só conclui quando todos** estão marcados — e essa conclusão continua sendo **uma** entrada no log, com o XP/ouro/bônus congelados como nos itens (a)–(c). Missão sem passos mantém o checkbox de sempre. Desmarcar um passo de uma missão concluída desfaz a conclusão (o XP volta), igual ao "Desfazer" atual.
- **Sem XP parcial (de propósito)**: marcar um passo não credita nada. XP por passo exigiria uma entrada por passo no log, inflaria `completedQuests` e mudaria as regras de ouro e atributo já congeladas nos itens anteriores. O valor do passo é **estrutura**: ele abre a missão e mostra o progresso (`2/4 passos`).
- **Reconciliação na edição**: passos casados pelo **título** (aparado) preservam `id` e `done`; título novo ganha `id` novo (nasce desmarcado); título removido desaparece. Editar a checklist **nunca** toca no log: o XP congelado não é reescrito por uma edição.
- **Balanceamento**: subtarefas não mudam XP, então a a 175 XP/dia (1 épica + 1 difícil + 1 média) o total é **idêntico** ao do item (c) — mês **5.250 → 6.503 XP** (nível 11 → 12) e trimestre **15.750 → 22.283 XP** (nível 18 → 22), com o bônus respondendo por 19% / 29%. Quebrar a épica em 3 passos muda a *forma* de jogar, não o prêmio.
- **Migração v7 → v8**: `subtasks` ausente/inválido vira `[]`; passos sem título são descartados e um `id` ausente ganha fallback determinístico (`sub-<índice>`). Sem perda de XP, ouro ou histórico.
- **UI**: o formulário de missão ganha a seção **Subtarefas** (limite de 12 passos, com dica para épicas); o cartão de missão ganha a pílula `N/M passos` e a checklist tocável (o checkbox principal vira o atalho "marcar/desmarcar todos"); a missão inicial de estudo já vem com 3 passos para apresentar o recurso.

### (e) Novas conquistas com data e toast — decisões

- **Modelo**: `AppState` ganha `seenAchievements: string[]` — os ids das conquistas **já anunciadas**. É o único dado de conquista que precisa ser persistido: o desbloqueio e a **data** são derivados do log. `schemaVersion` 8 → 9.
- **Conquista agora é regra + data**: o catálogo sai de `theme/game.ts` e vai para `src/domain/achievements.ts`. Cada conquista tem `unlockedAt(progress): string | null` (instante ISO do desbloqueio) em vez de um booleano. A data é derivada varrendo o log **cronológico**: n-ésima conclusão, XP acumulado que cruza o alvo, nível pela curva `50*(L−1)²`, n-ésima épica (o XP base `xp − bonusXp` identifica a dificuldade), sequência (com escudo), atributo de categoria, categorias cobertas e primeiro resgate.
- **Catálogo: 6 → 17 conquistas**. Novas: `Mil de XP` (1.000 XP), `Veterano de Guerra` (50 missões), `Centurião` (100 missões), `Caçador de Épicos` (1ª épica), `Matador de Dragões` (10 épicas), `Mês de Ferro` (30 dias seguidos), `Mestre` (nível 20), `Especialista` (atributo nível 5), `Multidisciplinar` (7 categorias), `Guardião` (comprou escudo), `Recompensa Merecida` (resgatou recompensa).
- **Toast**: uma conquista desbloqueada e ainda não vista vira um **banner no topo** (não disputa espaço com o toast de conclusão, que sobe de baixo), com haptics, data e auto-dismiss. Fechar marca como vista (persistido) e o próximo da fila assume. A fila é **derivada** (`seenAchievements` + avaliação), então várias conquistas de uma vez não precisam de fila em estado: cada dismiss deixa a próxima como "não vista".
- **Balanceamento** (175 XP/dia) — XP e ouro **intocados**: conquista é leitura do log, nunca crédito. Linha do tempo a 175 XP/dia (1 épica + 1 difícil + 1 média, bônus do item (c) incluso): `Primeiro Passo` e `Caçador de Épicos` no **dia 1**; `Multidisciplinar` no **dia 2**; `Constância` no **dia 3**; `Em Ritmo de Combate` no **dia 4**; `Ascensão` (800 XP) no **dia 5**; `Mil de XP` no **dia 6**; `Semana Perfeita` no **dia 7**; `Matador de Dragões` (10 épicas) no **dia 10**; `Especialista` (atributo nível 5, pela categoria mais forte a 30%) no **dia 16**; `Veterano de Guerra` (50 missões) no **dia 17**; `Mês de Ferro` no **dia 30**; `Centurião` (100 missões) no **dia 34**; `Mestre` (nível 20, 18.050 XP) por volta do **dia 74**. `Guardião`/`Recompensa Merecida` dependem do que o jogador compra (o ouro rende ~3 dias por escudo). Ao fim dos horizontes: **30 dias** → 33 missões, nível 12, recorde 30 dias, ~6.503 XP; **90 dias** → 99 missões, nível 22, recorde 90 dias, ~22.283 XP.
- **Migração v8 → v9**: `seenAchievements` **ausente** recebe as conquistas já desbloqueadas naquele estado (quem já jogava não leva uma chuva de toasts no primeiro boot após a atualização — nem ao importar um backup antigo); **presente**, é preservado e ids não-string são filtrados. Sem perda de XP, ouro ou histórico.
- **UI**: a aba Progresso troca o check por um selo **verde com a data** (`Desbloqueada em DD/MM/AAAA`) em cada conquista desbloqueada; o banner de conquista aparece no topo em qualquer tela.

---

## Rebrand: RPG Pessoal → Loopin (concluída)

- ✅ **Nome visível**: `expo.name` vira **Loopin** (é ele que aparece no launcher) e as strings visíveis acompanham (`Salvar backup do Loopin`, `não parece um backup do Loopin`, `loopin-backup.json`, README, ROADMAP, comentário de `level.ts`).
- ✅ **Ícone**: `assets/*.png` regerados a partir da arte nova (`icon.png` 1024, `android-icon-foreground.png` 512, `android-icon-background.png`, `android-icon-monochrome.png` 432, `favicon.png` 48, `splash-icon.png` 1024). A arte de origem é uma captura 320×256 com uma tarja clara nas duas primeiras linhas e o emblema brilhante em torno de (152, 100): o recorte é um quadrado de 176px centrado no emblema, sem a tarja, redimensionado com Lanczos + leve sharpen. O `backgroundColor` do ícone adaptativo continua `#0B0F1A` (o fundo do app); a camada monocromática vem da luminância do recorte (brilho → branco, fundo → transparente).
- **Chaves técnicas mantidas de propósito** (nada disso aparece para o usuário e trocar quebraria continuidade): `slug` (`rpg-pessoal`, ligado ao projeto na EAS), `scheme` (`rpgpessoal`), `package`/`bundleIdentifier` (`com.joaomolena.rpgpessoal` — trocar criaria um **app novo**, perdendo o progresso local de quem já joga), `STORAGE_KEY` (`@rpg-pessoal/state/v1`, por onde o estado antigo é encontrado e migrado) e os ids de notificação (`rpg-pessoal/daily-reminder`, `rpg-pessoal/streak-risk`).
- ✅ **Splash nativa**: plugin `expo-splash-screen` configurado em `app.json` com o fundo do app (`#0B0F1A`), `imageWidth: 200` e `resizeMode: "contain"`, usando `assets/splash-icon.png`. A imagem foi regerada a partir do mesmo recorte do ícone **com fade radial** (opaco no emblema, transparente na borda): a arte tem borda clara sobre fundo escuro, então como quadrado opaco apareceria uma emenda dura. A tela de hidratação em `_layout.tsx` mostra a **mesma imagem no mesmo fundo**, e `SplashScreen.setOptions({ duration: 600, fade: true })` faz a saída desvanecer — sem salto de cor nem de logo no boot.
- **Detalhe técnico**: a tela de hidratação trocou o `⚔️` pelo logo. A primeira imagem importada do projeto exigiu `src/types/images.d.ts`, porque o `expo-env.d.ts` (que declara `*.png`) é gerado pelo `expo start` e fica fora do Git — sem essa declaração o `tsc` de um clone limpo (e o CI) não conhece imagens.

> Fases 4+ ainda não definidas.
