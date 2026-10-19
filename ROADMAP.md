# ROADMAP — RPG Pessoal

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

## Fase 2 — Recorrências, notificações, feedback e backup (em execução)

- ✅ **Missões recorrentes**: novo modelo `QuestTemplate` (título, categoria, dificuldade, recorrência diária / dias da semana / semanal, ativo, última data gerada) com geração **idempotente** (abrir o app duas vezes no mesmo dia não duplica; dias perdidos não geram retroativos) e tela para criar, editar e pausar.
- **Notificações locais** (`expo-notifications`): lembrete diário configurável e aviso de streak em risco, pedindo permissão no momento certo (não no boot).
- **Feedback de conclusão**: haptics, "+XP" animado e toast com "Desfazer", respeitando "reduzir movimento" do sistema.
- **Backup**: exportar e importar em JSON, com validação e confirmação antes de sobrescrever.

> Fases 3+ ainda não definidas.
