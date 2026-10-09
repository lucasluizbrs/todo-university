# Mobile App Reverse-Engineering Questions (Expo + React Native)

## 1. Project Structure
O projeto utiliza o **Expo SDK 57** estruturado com roteamento baseado em arquivos através do **`expo-router`**.
*   **Telas Obrigatórias:** `src/app/(tabs)/index.tsx` (Lista principal de tarefas), `src/app/editor/[id].tsx` (Criação/Edição dinâmica) e `src/app/categories.tsx` (Gerenciador de Categorias).
*   **Modelos de Dados:** Centralizados e tipados na pasta `src/types/`.
*   **Banco de Dados:** SQLite gerenciado de forma reativa a partir do inicializador central em `src/lib/todo-database.ts`.

## 2. Architecture and State
A interface do usuário (UI) é atualizada de forma reativa a partir das mudanças de estado em memória refletidas síncronamente no banco de dados SQLite local, seguindo um fluxo de dados unidirecional estável.

## 3. SQLite Persistence
Utilização da biblioteca moderna `expo-sqlite`. O banco armazena dados booleanos de status (concluído/pendente) como inteiros (0 ou 1) e os prazos cronológicos como strings formatadas em padrão ISO 8601 UTC para viabilizar consultas diretas em SQL nativo.

## 4. Follow One Operation
Ao clicar em "Salvar" no formulário de criação, a UI valida os campos obrigatórios, gera um identificador único, executa a escrita física (`INSERT INTO`) via SQLite e atualiza o estado local da lista, disparando o agendamento seguro de alertas locais caso haja um prazo futuro.

## 5. Navigation
A passagem de telas utiliza o `expo-router` repassando apenas o **ID string da tarefa** como parâmetro de rota URL para mitigar dados defasados (*Stale Data*), forçando a tela de destino a buscar dados atualizados em tempo real no banco.

## 6. Notifications
Gerenciamento local via `expo-notifications`. Modificações ou exclusões de tarefas disparam o método de cancelamento explícito do alarme a partir do ID da tarefa previamente mapeado no sistema operacional.

## 7. Agent Decisions
O agente Cline adotou de forma autônoma a estratégia de transação unificada `db.withTransactionSync` para atualizar o relacionamento das tarefas para `NULL` (*Set Null*) antes de deletar fisicamente uma categoria. Para contornar falhas de *lazy workers* de banco no navegador, configurou o `app.json` com a diretiva de saída SPA (`web.output: "single"`) e estendeu o `metro.config.js` para ler binários `.wasm`.

## 8. BUILD_LOG Analysis
O log registrou de forma incremental erros críticos de travamento de compilação da Web e incompatibilidade de pacotes de linting do template. A análise detalhou os contornos e correções estruturais de rotas dinâmicas, detalhes invisíveis no código estático final.
