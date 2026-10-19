# 🔁 Loopin

Um aplicativo mobile de **RPG pessoal** construído com **React Native + Expo + TypeScript**.
Transforme suas tarefas diárias em missões, ganhe XP, soba de nível e mantenha sua sequência de constância — tudo com um visual moderno em modo escuro.

## ✨ Funcionalidades

- **Missões diárias**: crie, edite, conclua e exclua missões com categoria (Saúde, Estudo, Trabalho, Finanças, Lazer, Social, Outros) e dificuldade (Fácil, Média, Difícil, Épica).
- **Missões recorrentes**: crie modelos que geram a missão do dia automaticamente — diária, em dias escolhidos da semana ou semanal. A geração é idempotente (abrir o app duas vezes no mesmo dia não duplica) e não retroage: dias não abertos não criam missões. Dá para pausar sem apagar o histórico.
- **Notificações locais**: lembrete diário e aviso de "sequência em risco" no fim do dia, cada um com horário configurável. Roda no próprio aparelho, sem internet; a permissão é pedida só quando você ativa uma opção.
- **Sistema de XP e níveis**: cada missão concluída concede XP conforme a dificuldade; o nível é calculado a partir do XP acumulado, com curva de dificuldade crescente.
- **Atributos por categoria**: cada uma das 7 categorias tem XP e **nível próprio** (o "atributo"). O XP da categoria fica congelado no momento da conclusão, então editar a missão depois não move atributo.
- **Ouro e loja de recompensas**: cada 5 XP viram 1 de ouro (fácil 2 · média 5 · difícil 10 · épica 20). Crie as suas próprias recompensas com o preço que quiser e resgate-as com o ouro conquistado. O ouro ganho fica congelado na conclusão e o resgate é bloqueado sem saldo.
- **Escudo de sequência**: compre com ouro (100 cada, até 3 em reserva) um dia de folga. Se você perder um dia, o escudo é consumido no seu lugar e a sequência continua viva. Ele vale do dia da compra em diante — não conserta buracos antigos.
- **Missões épicas com subtarefas**: quebre uma missão grande em até 12 passos. Ela só conta como concluída quando **todos** os passos estiverem marcados — e continua sendo **uma** entrada no log, com XP, ouro e bônus congelados naquele momento. Marcar um passo não dá XP parcial (de propósito: prêmio por passo inflaria o histórico). Desmarcar um passo de uma missão concluída desfaz a conclusão. Editar a missão reconcilia os passos **pelo título**, preservando o que já estava marcado e sem tocar no log.
- **Títulos (ranks)**: Recruta → Aprendiz → Aventureiro → Herói → Veterano → Elite → Mestre → Lenda → Mítico.
- **Sequência (streak)**: acompanhe os dias consecutivos com pelo menos uma missão concluída. Quanto maior a sequência, mais XP cada missão rende: **+10% a partir de 3 dias**, até **+50% a partir de 30**. Ao passar um dia inteiro sem concluir nada, a sequência volta a zero — a menos que você tenha um **escudo de sequência**.
- **Tela de Progresso**: estatísticas, conquistas (cada uma com a **data em que foi desbloqueada**), progresso por categoria e histórico recente.
- **Conquistas**: 17 conquistas derivadas do histórico — missões concluídas, XP acumulado, nível, sequência (contando os dias cobertos por escudo), épicas, categoria fechada, atributo forte e compras na loja. A data de desbloqueio é **calculada varrendo o log**, nunca gravada; desbloquear dispara um **banner no topo** com a data, que se fecha sozinho e não repete.
- **Missões atrasadas**: missões não concluídas no dia anterior aparecem destacadas para você não esquecê-las.
- **Celebração de Level Up**: overlay animado quando você sobe de nível.
- **Feedback de conclusão**: vibração, "+XP" animado e toast com **"Desfazer"** para desmarcar na hora. Respeita "reduzir movimento" do sistema (sem deslocamentos).
- **Backup dos dados**: exporte todo o progresso num arquivo `.json` (para guardar ou trocar de aparelho) e importe de volta. A importação valida o arquivo, migra backups antigos e confirma antes de substituir o progresso atual.
- **Perfil personalizável**: nome e avatar do herói.
- **Persistência local**: todo o progresso é salvo com `AsyncStorage` e sobrevive ao fechamento do app.
- **Dados versionados**: o estado salvo tem `schemaVersion` e passa por migração/validação na leitura (v1 → v2 → v3 → v4 → v5 → v6 → v7 → v8 → v9), sem perder XP, ouro nem histórico.
- **Modo escuro moderno**: paleta escura com gradientes roxo/ciano, cartões arredondados e sombras suaves.
- **Splash nativa**: o logo Loopin sobre o fundo escuro do app, configurada pelo plugin `expo-splash-screen` e com fade para a interface — sem piscar nem salto de cor. (Só aparece de verdade em **build**; no Expo Go o Android mostra o ícone do app por causa da API de splash do Android 12+.)

## 🚀 Como executar

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento
npx expo start
```

Escaneie o QR code com o app **Expo Go** (Android/iOS), ou pressione `a` (Android) / `i` (iOS) com um emulador aberto.

> Observação: o app usa apenas módulos compatíveis com o Expo Go (`expo-router`, `AsyncStorage`, `LinearGradient`, ícones, `expo-notifications` local, `expo-haptics`, `expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-splash-screen`), então não é necessário build de desenvolvimento. Só o *push* remoto do `expo-notifications` exigiria um build de desenvolvimento — o app não usa push. A splash, porém, só reflete a configuração num build (no Expo Go o Android mostra o ícone do app).

## 📁 Estrutura do projeto

```
src/
├── app/                    # Rotas (Expo Router — file-based routing)
│   ├── _layout.tsx         # Layout raiz (hidratação + providers + feedback de conclusão + level up)
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Navegação por abas
│   │   ├── index.tsx       # Início (painel do herói + missões de hoje)
│   │   ├── missoes.tsx     # Missões (filtros: hoje/pendentes/concluídas/todas)
│   │   └── progresso.tsx   # Progresso (stats, atributos, conquistas, histórico)
│   ├── nova-missao.tsx     # Modal de criação/edição de missão
│   ├── recorrentes.tsx     # Modal de missões recorrentes (listar/pausar/excluir)
│   ├── nova-recorrente.tsx # Modal de criação/edição de missão recorrente
│   ├── lembretes.tsx       # Modal de notificações (lembrete diário + sequência)
│   ├── backup.tsx          # Modal de backup (exportar/importar JSON)
│   ├── loja.tsx            # Modal da loja (saldo, recompensas e histórico de resgates)
│   ├── nova-recompensa.tsx # Modal de criação/edição de recompensa
│   └── editar-perfil.tsx   # Modal de perfil (nome, avatar, reset)
├── backup/                 # Backup em JSON
│   ├── format.ts           # Serialização + validação/migração do arquivo (puro)
│   └── backup.ts           # Gravar/compartilhar e escolher/ler o arquivo (nativo)
├── components/             # Componentes reutilizáveis (ConfirmDialog, TemplateCard, RewardCard, TimeField, CompletionFeedback, AchievementFeedback...)
├── context/GameContext.tsx # Estado global + persistência + hidratação + geração diária + feedback
├── domain/                 # Regras puras (reducer + estatísticas derivadas)
│   ├── reducer.ts          # Reducer puro (ações entram com id/data prontos)
│   ├── recurrence.ts       # Recorrência pura (casamento por dia + plano de geração)
│   ├── attributes.ts       # Atributos por categoria (XP e nível próprios por área)
│   ├── economy.ts          # Ouro: taxa de conversão, ganho, gasto e saldo
│   ├── streak.ts           # Bônus de XP por sequência (degraus + cálculo)
│   ├── shield.ts           # Escudo de sequência (preço, reserva e dias protegidos)
│   ├── subtasks.ts         # Passos da missão (todos marcados + reconciliação por título)
│   ├── achievements.ts     # Catálogo de conquistas + data de desbloqueio derivada do log
│   └── stats.ts            # XP, streak, nível, atributos, ouro e escudos derivados do log
├── hooks/
│   ├── useToday.ts         # "Hoje" reativo (AppState + virada do dia)
│   └── useReduceMotion.ts  # Preferência "reduzir movimento" do sistema
├── notifications/          # Notificações locais (expo-notifications)
│   ├── plan.ts             # Plano de agendamento puro (o que cancelar/agendar)
│   ├── notifications.ts    # Executa o plano (permissão, canal Android, agendamentos)
│   └── useNotificationSync.ts # Sincroniza os lembretes com o estado
├── storage/
│   ├── storage.ts          # Leitura/escrita no AsyncStorage
│   └── migrations.ts       # Validação + migração de schema (v1 → v2 → … → v9)
├── theme/game.ts           # Cores, gradientes, categorias e dificuldades
├── types/
│   ├── index.ts            # Tipos do domínio
│   └── images.d.ts         # Declaração de `*.png` (o expo-env.d.ts é gerado e não vai para o Git)
└── utils/
    ├── level.ts            # Fórmulas de nível e ranks
    ├── dates.ts            # Utilitários de data (dias, streak, saudações)
    ├── time.ts             # Horários "HH:MM" (parse/format)
    ├── haptics.ts          # Vibrações (expo-haptics)
    ├── format.ts           # Formatação (plural de missões)
    └── id.ts               # Gerador de IDs
```

## 🧪 Testes e qualidade

```bash
npm test            # testes unitários (Jest + jest-expo)
npm run lint        # ESLint (expo lint)
npm run typecheck   # TypeScript (tsc --noEmit)
```

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda os três a cada push/PR.

## 📊 Fórmula de nível

O nível é derivado do **XP acumulado**:

```
XP acumulado para atingir o nível L = 50 × (L − 1)²
```

| Nível | XP total necessário |
| ----- | ------------------- |
| 2     | 50                  |
| 3     | 200                 |
| 4     | 450                 |
| 5     | 800                 |
| 10    | 4.050               |

A curva quadrática faz o progresso ficar mais desafiador conforme você evolui.

**XP por dificuldade da missão:** Fácil = 10 · Média = 25 · Difícil = 50 · Épica = 100.

## 🪙 Fórmula do ouro

Cada **5 XP** conquistados viram **1 de ouro**:

```
ouro = round(xp / 5)        →  fácil 2 · média 5 · difícil 10 · épica 20
saldo = max(0, ouro ganho − ouro gasto em resgates)
```

A 175 XP/dia (1 épica + 1 difícil + 1 média), isso dá **35 de ouro por dia** — cerca de 1.050 em 30 dias e 3.150 em 90 dias. Preços de referência: 25 (≈ 1 dia), 100 (≈ 3 dias), 250 (≈ 7 dias).

## 🔥 Fórmula da sequência

Cada dia seguido com pelo menos uma missão concluída aumenta o bônus de XP do dia:

| Sequência | Bônus de XP |
| --------- | ----------- |
| 1–2 dias  | +0%         |
| 3–6 dias  | +10%        |
| 7–13 dias | +20%        |
| 14–29 dias | +30%        |
| 30+ dias  | +50%        |

```
bonusXp = round(xp da missão × percentual)
xp creditado = xp da missão + bonusXp
```

O bônus é **XP** (conta para nível e atributos), não ouro: o ouro continua ligado à dificuldade. A 175 XP/dia, a sequência leva os mesmos 175 XP/dia até 263 XP/dia (+50%) — 6.503 XP em 30 dias e 22.283 em 90 dias, contra 5.250 e 15.750 sem bônus. O valor fica **congelado** na conclusão, então a tabela pode mudar no futuro sem reprecificar o passado.

Para não perder a sequência num dia atrapalhado, a loja vende o **escudo de sequência** (100 de ouro, até 3 em reserva): ele cobre um dia sem conclusão e mantém a sequência viva.

## 🛠️ Stack

- [Expo SDK 58](https://docs.expo.dev/) com [Expo Router](https://docs.expo.dev/router/introduction/) (navegação por arquivos)
- React Native 0.88 + React 19
- TypeScript (modo estrito)
- `@react-native-async-storage/async-storage` (persistência)
- `expo-linear-gradient` (gradientes) · `@expo/vector-icons` (ícones Material Community) · `expo-notifications` (notificações locais) · `expo-haptics` (vibração) · `expo-file-system` + `expo-sharing` + `expo-document-picker` (backup em arquivo) · `expo-splash-screen` (splash nativa)
