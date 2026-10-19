# ⚔️ RPG Pessoal

Um aplicativo mobile de **RPG pessoal** construído com **React Native + Expo + TypeScript**.
Transforme suas tarefas diárias em missões, ganhe XP, soba de nível e mantenha sua sequência de constância — tudo com um visual moderno em modo escuro.

## ✨ Funcionalidades

- **Missões diárias**: crie, edite, conclua e exclua missões com categoria (Saúde, Estudo, Trabalho, Finanças, Lazer, Social, Outros) e dificuldade (Fácil, Média, Difícil, Épica).
- **Missões recorrentes**: crie modelos que geram a missão do dia automaticamente — diária, em dias escolhidos da semana ou semanal. A geração é idempotente (abrir o app duas vezes no mesmo dia não duplica) e não retroage: dias não abertos não criam missões. Dá para pausar sem apagar o histórico.
- **Notificações locais**: lembrete diário e aviso de "sequência em risco" no fim do dia, cada um com horário configurável. Roda no próprio aparelho, sem internet; a permissão é pedida só quando você ativa uma opção.
- **Sistema de XP e níveis**: cada missão concluída concede XP conforme a dificuldade; o nível é calculado a partir do XP acumulado, com curva de dificuldade crescente.
- **Títulos (ranks)**: Recruta → Aprendiz → Aventureiro → Herói → Veterano → Elite → Mestre → Lenda → Mítico.
- **Sequência (streak)**: acompanhe os dias consecutivos com pelo menos uma missão concluída. O streak volta a zero ao passar um dia inteiro sem concluir nada (não há bônus de XP por constância).
- **Tela de Progresso**: estatísticas, conquistas desbloqueáveis, progresso por categoria e histórico recente.
- **Missões atrasadas**: missões não concluídas no dia anterior aparecem destacadas para você não esquecê-las.
- **Celebração de Level Up**: overlay animado quando você sobe de nível.
- **Feedback de conclusão**: vibração, "+XP" animado e toast com **"Desfazer"** para desmarcar na hora. Respeita "reduzir movimento" do sistema (sem deslocamentos).
- **Backup dos dados**: exporte todo o progresso num arquivo `.json` (para guardar ou trocar de aparelho) e importe de volta. A importação valida o arquivo, migra backups antigos e confirma antes de substituir o progresso atual.
- **Perfil personalizável**: nome e avatar do herói.
- **Persistência local**: todo o progresso é salvo com `AsyncStorage` e sobrevive ao fechamento do app.
- **Dados versionados**: o estado salvo tem `schemaVersion` e passa por migração/validação na leitura (v1 → v2 → v3 → v4), sem perder XP.
- **Modo escuro moderno**: paleta escura com gradientes roxo/ciano, cartões arredondados e sombras suaves.

## 🚀 Como executar

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento
npx expo start
```

Escaneie o QR code com o app **Expo Go** (Android/iOS), ou pressione `a` (Android) / `i` (iOS) com um emulador aberto.

> Observação: o app usa apenas módulos compatíveis com o Expo Go (`expo-router`, `AsyncStorage`, `LinearGradient`, ícones, `expo-notifications` local, `expo-haptics`, `expo-file-system`, `expo-sharing`, `expo-document-picker`), então não é necessário build de desenvolvimento. Só o *push* remoto do `expo-notifications` exigiria um build de desenvolvimento — o app não usa push.

## 📁 Estrutura do projeto

```
src/
├── app/                    # Rotas (Expo Router — file-based routing)
│   ├── _layout.tsx         # Layout raiz (hidratação + providers + feedback de conclusão + level up)
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Navegação por abas
│   │   ├── index.tsx       # Início (painel do herói + missões de hoje)
│   │   ├── missoes.tsx     # Missões (filtros: hoje/pendentes/concluídas/todas)
│   │   └── progresso.tsx   # Progresso (stats, conquistas, histórico)
│   ├── nova-missao.tsx     # Modal de criação/edição de missão
│   ├── recorrentes.tsx     # Modal de missões recorrentes (listar/pausar/excluir)
│   ├── nova-recorrente.tsx # Modal de criação/edição de missão recorrente
│   ├── lembretes.tsx       # Modal de notificações (lembrete diário + sequência)
│   ├── backup.tsx          # Modal de backup (exportar/importar JSON)
│   └── editar-perfil.tsx   # Modal de perfil (nome, avatar, reset)
├── backup/                 # Backup em JSON
│   ├── format.ts           # Serialização + validação/migração do arquivo (puro)
│   └── backup.ts           # Gravar/compartilhar e escolher/ler o arquivo (nativo)
├── components/             # Componentes reutilizáveis (ConfirmDialog, TemplateCard, TimeField, CompletionFeedback...)
├── context/GameContext.tsx # Estado global + persistência + hidratação + geração diária + feedback
├── domain/                 # Regras puras (reducer + estatísticas derivadas)
│   ├── reducer.ts          # Reducer puro (ações entram com id/data prontos)
│   ├── recurrence.ts       # Recorrência pura (casamento por dia + plano de geração)
│   └── stats.ts            # XP, streak e nível derivados do log de conclusões
├── hooks/
│   ├── useToday.ts         # "Hoje" reativo (AppState + virada do dia)
│   └── useReduceMotion.ts  # Preferência "reduzir movimento" do sistema
├── notifications/          # Notificações locais (expo-notifications)
│   ├── plan.ts             # Plano de agendamento puro (o que cancelar/agendar)
│   ├── notifications.ts    # Executa o plano (permissão, canal Android, agendamentos)
│   └── useNotificationSync.ts # Sincroniza os lembretes com o estado
├── storage/
│   ├── storage.ts          # Leitura/escrita no AsyncStorage
│   └── migrations.ts       # Validação + migração de schema (v1 → v2 → v3 → v4)
├── theme/game.ts           # Cores, gradientes, categorias, dificuldades, conquistas
├── types/index.ts          # Tipos do domínio
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

## 🛠️ Stack

- [Expo SDK 58](https://docs.expo.dev/) com [Expo Router](https://docs.expo.dev/router/introduction/) (navegação por arquivos)
- React Native 0.88 + React 19
- TypeScript (modo estrito)
- `@react-native-async-storage/async-storage` (persistência)
- `expo-linear-gradient` (gradientes) · `@expo/vector-icons` (ícones Material Community) · `expo-notifications` (notificações locais) · `expo-haptics` (vibração) · `expo-file-system` + `expo-sharing` + `expo-document-picker` (backup em arquivo)
