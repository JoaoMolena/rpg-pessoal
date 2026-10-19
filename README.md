# ⚔️ RPG Pessoal

Um aplicativo mobile de **RPG pessoal** construído com **React Native + Expo + TypeScript**.
Transforme suas tarefas diárias em missões, ganhe XP, soba de nível e mantenha sua sequência de constância — tudo com um visual moderno em modo escuro.

## ✨ Funcionalidades

- **Missões diárias**: crie, edite, conclua e exclua missões com categoria (Saúde, Estudo, Trabalho, Finanças, Lazer, Social, Outros) e dificuldade (Fácil, Média, Difícil, Épica).
- **Sistema de XP e níveis**: cada missão concluída concede XP conforme a dificuldade; o nível é calculado a partir do XP acumulado, com curva de dificuldade crescente.
- **Títulos (ranks)**: Recruta → Aprendiz → Aventureiro → Herói → Veterano → Elite → Mestre → Lenda → Mítico.
- **Sequência (streak)**: ganhe bônus de constância por dias consecutivos com missões concluídas.
- **Tela de Progresso**: estatísticas, conquistas desbloqueáveis, progresso por categoria e histórico recente.
- **Missões atrasadas**: missões não concluídas no dia anterior aparecem destacadas para você não esquecê-las.
- **Celebração de Level Up**: overlay animado quando você sobe de nível.
- **Perfil personalizável**: nome e avatar do herói.
- **Persistência local**: todo o progresso é salvo com `AsyncStorage` e sobrevive ao fechamento do app.
- **Modo escuro moderno**: paleta escura com gradientes roxo/ciano, cartões arredondados e somagens suaves.

## 🚀 Como executar

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento
npx expo start
```

Escaneie o QR code com o app **Expo Go** (Android/iOS), ou pressione `a` (Android) / `i` (iOS) com um emulador aberto.

> Observação: o app usa apenas módulos compatíveis com o Expo Go (`expo-router`, `AsyncStorage`, `LinearGradient`, ícones), então não é necessário build de desenvolvimento.

## 📁 Estrutura do projeto

```
src/
├── app/                    # Rotas (Expo Router — file-based routing)
│   ├── _layout.tsx         # Layout raiz (Stack + provider + overlay de level up)
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Navegação por abas
│   │   ├── index.tsx       # Início (painel do herói + missões de hoje)
│   │   ├── missoes.tsx     # Missões (filtros: hoje/pendentes/concluídas/todas)
│   │   └── progresso.tsx   # Progresso (stats, conquistas, histórico)
│   ├── nova-missao.tsx     # Modal de criação/edição de missão
│   └── editar-perfil.tsx   # Modal de perfil (nome, avatar, reset)
├── components/             # Componentes reutilizáveis
├── context/GameContext.tsx # Estado global + persistência + regras de XP/streak
├── storage/storage.ts      # Leitura/escrita no AsyncStorage
├── theme/game.ts           # Cores, gradientes, categorias, dificuldades, conquistas
├── types/index.ts          # Tipos do domínio
└── utils/
    ├── level.ts            # Fórmulas de nível e ranks
    ├── dates.ts            # Utilitários de data (dias, streak, saudações)
    └── id.ts               # Gerador de IDs
```

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
- `expo-linear-gradient` (gradientes) · `@expo/vector-icons` (ícones Material Community)
