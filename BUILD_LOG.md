# BUILD_LOG — Iteration 3 (Expo + React Native)

## Prompt

Implementar do zero a Iteration 3 (Expo + RN) do projeto da faculdade: criar `todo-university` na Área de Trabalho, inicializar um app Expo moderno com TypeScript e `expo-router` em `iteration-3-expo`, registrar o setup neste `BUILD_LOG.md`, instalar `expo-sqlite` e `expo-notifications`, garantir suporte a execução no navegador (`react-native-web`, `react-dom`, `@expo/metro-runtime`) e inicializar o repositório Git local.

## Decision Summary

- Pasta-mãe: `C:\Users\Advocacia\Desktop\todo-university`.
- App Expo em `iteration-3-expo` com template **default** (SDK 57, TypeScript, `expo-router` file-based) em vez de `blank-typescript`, porque o blank não inclui roteamento por arquivos.
- Workspace do agente apontado para o projeto assim que a pasta existe.
- Dependências nativas da especificação instaladas com `npx expo install` para alinhar versões ao SDK.
- Pacotes web instalados explicitamente (mesmo com `react-native-web` e `react-dom` já vindos no template) e `@expo/metro-runtime` adicionado para `expo start --web`.
- Git inicializado em `iteration-3-expo` (raiz do app). O scaffold já tinha o commit `Initial commit`.
- Remoto oficial: `https://github.com/lucasluizbrs/todo-university.git` (origin), branch `main`.

## Actions Performed

1. Criada pasta vazia `C:\Users\Advocacia\Desktop\todo-university`.
2. Workspace do agente movido para `todo-university`.
3. Executado `npx --yes create-expo-app@latest iteration-3-expo --template default`.
4. Criado este `BUILD_LOG.md` na raiz de `iteration-3-expo`.
5. Workspace do agente movido para `iteration-3-expo`.
6. Executado `npx expo install expo-sqlite expo-notifications` (5 pacotes adicionados; plugin `expo-sqlite` inserido em `app.json`).
7. Executado `npx expo install react-native-web react-dom @expo/metro-runtime` (`@expo/metro-runtime` ~57.0.16; `react-native-web` e `react-dom` alinhados ao SDK 57).
8. Executado `git init` na raiz de `iteration-3-expo` (o scaffold já tinha `.git` + `Initial commit`).
9. `git remote add origin https://github.com/lucasluizbrs/todo-university.git`
10. `git branch -M main`
11. `git add .` + `git commit -m "chore: initial project setup and build log"`
12. `git push -u origin main`

## Result

- Projeto Expo SDK ~57 criado com `expo-router` (`main`: `expo-router/entry`, rotas em `src/app/`).
- `npm install` do scaffold concluiu: 607 pacotes adicionados.
- Script `npm run web` já presente no `package.json` gerado.
- Dependências da especificação no `package.json`: `expo-sqlite` ~57.0.4, `expo-notifications` ~57.0.22, `react-native-web` ^0.21.2, `react-dom` 19.2.3, `@expo/metro-runtime` ~57.0.16.
- Aviso npm: `uuid@7.0.3` deprecated (dependência transitiva do template).
- `npm audit` reportou 29 vulnerabilidades (11 moderate, 18 high) no scaffold; não foi aplicado `npm audit fix --force` para não quebrar o SDK.

## Problems/Errors

- Primeira tentativa de `move_agent_to_root` abortou; pasta criada com sucesso e move reexecutado.
- `create-expo-app` ultrapassou 180s enquanto o `npm install` rodava; o comando concluiu em background com sucesso.
- Template `blank-typescript` não atende `expo-router`; usado `default` (decisão consciente, alinhada ao “or similar”).
- `git init` reportou “Reinitialized existing Git repository”: o `create-expo-app` já havia criado `.git` no scaffold. Repositório local permanece válido.

## Fixes Attempted

- Retry de `move_agent_to_root` após abort.
- Escolha do template `default` para TypeScript + file-based routing sem scaffolding manual extra.

## Current Status

**IN PROGRESS** — setup local pronto; em seguida o push inicial para o GitHub e a implementação de SQLite, telas, contexto e notificações.
