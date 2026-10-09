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

## Incremento — Formulário dinâmico de tarefas

### Decision Summary

- Adicionada a rota `src/app/editor/[id].tsx`, usando Expo Router para distinguir criação (`new`) e edição por ID.
- Como não havia esquema SQLite no projeto, a tela abre `todo.db` de forma assíncrona e cria `tasks` e `categories` apenas se ainda não existirem.
- Quando a tabela de categorias está vazia, são inseridas categorias iniciais; a lista do formulário é sempre consultada da tabela `categories`.
- Lembretes de prazo usam `expo-notifications` somente em plataformas nativas, protegidos por verificação de plataforma e `try/catch`.
- A saída Web mudou de `static` para `single` porque o `@expo/metro-config` 57.0.13 falha ao servir workers em bundles lazy com saída `static`; a saída SPA é compatível com essa rota client-side.

### Actions Performed

1. Criada a tela de formulário com título obrigatório, descrição, data, hora, categoria e status.
2. Implementados carregamento/edição, `INSERT`, `UPDATE`, exclusão com confirmação e retorno à tela inicial.
3. Adicionada validação dos formatos de data/hora e proteção de notificações para Web.
4. Configurado o Metro para incluir WASM do SQLite e adicionados cabeçalhos COOP/COEP para hosting Web.
5. Organizadas as telas existentes no grupo `(tabs)` e configurado um Stack raiz para deixar o editor fora do navegador de abas.

### Result

- A rota suporta criar, editar e excluir tarefas persistidas no banco `todo.db`.
- O seletor de categorias exibe os registros reais de `categories`.
- O teste no navegador criou uma tarefa temporária, atualizou seu título e confirmou a persistência após recarregar, depois excluiu o registro; a tela retornou à Home.
- `npx tsc --noEmit` passou e `npx expo export --platform web` concluiu com a rota dinâmica incluída.
- O lint não foi executado: o projeto não tem ESLint configurado e a instalação foi recusada para manter o escopo.

### Problems/Errors

- Não havia implementação ou documentação local que definisse o esquema do banco; a tela passa a inicializar o esquema mínimo descrito acima.
- A primeira exportação Web não encontrou o asset WASM; a configuração de Metro acima resolveu o problema.
- O servidor Web em modo dev encontrou o bug `Worker chunk not found` do Metro 57 com `web.output: static`; `web.output: single` evita o caso afetado.
- A raiz do template tratava todas as rotas como abas; o editor passou para um Stack de nível raiz e Home/Explore para `(tabs)`.
- `expo lint` encerra com erro quando ESLint não está configurado.

### Fixes Attempted

- Incluído `wasm` em `resolver.assetExts` no Metro; a exportação Web passou após o ajuste.
- Alterada a saída Web para `single`, evitando o erro de worker do Metro 57 no servidor de desenvolvimento.
- Criado um Stack raiz e um grupo `(tabs)` para que `/editor/[id]` seja uma tela dinâmica, não uma aba.

### Current Status

**IN PROGRESS** — formulário implementado; typecheck e CRUD no navegador aprovados. ESLint permanece sem configuração por decisão de escopo; as demais telas e o fluxo completo da Iteration 3 continuam pendentes.

## Incremento — Listagem de tarefas na rota raiz

### Decision Summary

- A rota `/` é representada por `src/app/(tabs)/index.tsx`; esse arquivo ainda renderizava o scaffold “Welcome to Expo”.
- A rota inicial agora renderiza `TaskList`, com dados lidos de `todo.db`, e compartilha o inicializador SQLite com o editor.

### Actions Performed

1. Criado `src/components/task-list.tsx` para listar tarefas, mostrar estado vazio e contadores, concluir tarefas e abrir criação/edição.
2. Extraída a abertura e inicialização de `todo.db` para `src/lib/todo-database.ts`, reutilizada pela lista e pelo editor.
3. Substituído o conteúdo genérico da rota inicial pelo componente `TaskList`.

### Result

- A rota `/` abre diretamente a listagem; não é necessário um redirect para outra tela.
- Typecheck e exportação Web passaram. No navegador, uma tarefa criada apareceu na lista e pôde ser excluída.

### Current Status

**IN PROGRESS** — listagem conectada ao SQLite na rota raiz; as demais telas e o fluxo completo da Iteration 3 continuam pendentes.
