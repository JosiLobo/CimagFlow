# 📋 Módulo de Gerenciamento de Demandas

## 🎯 Visão Geral

O módulo de Demandas é um sistema completo para gerenciar solicitações, reclamações e requisições de prefeituras e cidadãos. Inclui:

- ✅ Sistema de protocolo único
- ✅ Workflow com múltiplos status
- ✅ Board Kanban interativo
- ✅ Notificações automáticas por email
- ✅ Histórico completo de alterações
- ✅ Atribuição de responsáveis
- ✅ Sistema de prioridades
- ✅ Consulta pública de protocolo

## 🗂️ Estrutura do Módulo

### 1. **Banco de Dados**

#### Tabela: `demands`
```sql
- id: Identificador único
- protocolNumber: Número de protocolo (ex: 2026-000001)
- title: Título da demanda
- description: Descrição detalhada
- status: Status atual (ABERTA, EM_ANALISE, etc.)
- priority: Prioridade (BAIXA, MEDIA, ALTA, URGENTE)
- requesterName: Nome do requerente
- requesterEmail: Email do requerente
- requesterPhone: Telefone (opcional)
- requesterCpf: CPF (opcional)
- prefectureId: Prefeitura relacionada
- assignedToId: Usuário responsável
- createdBy: Criador da demanda
- dueDate: Data limite
- resolvedAt: Data de resolução
- attachments: Anexos (array)
- internalNotes: Notas internas
- resolution: Resolução da demanda
```

#### Tabela: `demand_history`
```sql
- id: Identificador único
- demandId: ID da demanda
- userName: Nome do usuário que fez a alteração
- action: Tipo de ação (CRIADA, STATUS_ALTERADO, etc.)
- oldValue: Valor anterior
- newValue: Novo valor
- comment: Comentário
- createdAt: Data/hora da alteração
```

### 2. **Status Disponíveis**

| Status | Descrição | Cor |
|--------|-----------|-----|
| `ABERTA` | Demanda recém criada | Azul |
| `EM_ANALISE` | Em análise pela equipe | Amarelo |
| `EM_ANDAMENTO` | Sendo trabalhada | Laranja |
| `AGUARDANDO_RESPOSTA` | Aguardando resposta do requerente | Roxo |
| `CONCLUIDA` | Demanda resolvida | Verde |
| `CANCELADA` | Cancelada | Vermelho |

### 3. **Prioridades**

| Prioridade | Descrição |
|------------|-----------|
| `BAIXA` | Pode ser resolvida sem urgência |
| `MEDIA` | Prioridade padrão |
| `ALTA` | Requer atenção prioritária |
| `URGENTE` | Requer ação imediata |

## 📍 Rotas e Páginas

### Páginas Internas (Autenticadas)

#### `/demandas`
- **Descrição**: Listagem e board de demandas
- **Recursos**:
  - Visualização em lista ou board Kanban
  - Filtros por status, prioridade, prefeitura
  - Busca por protocolo, título ou requerente
  - Cards estatísticos
  - Navegação rápida para detalhes

#### `/demandas/nova`
- **Descrição**: Criar nova demanda
- **Campos**:
  - Título e descrição
  - Prioridade e data limite
  - Informações do requerente (nome, email, telefone, CPF)
  - Prefeitura e responsável
- **Ações**:
  - Gera protocolo automático
  - Envia email de confirmação
  - Cria histórico inicial
  - Notifica responsável (se atribuído)

#### `/demandas/[id]`
- **Descrição**: Detalhes e edição de demanda
- **Recursos**:
  - Visualização completa
  - Edição de status, prioridade, responsável
  - Adição de resolução e notas internas
  - Histórico completo de alterações
  - Informações do requerente e prefeitura
  - Exclusão de demanda
  - Timeline de eventos

### Páginas Públicas (Sem Autenticação)

#### `/consulta-protocolo`
- **Descrição**: Consulta pública de protocolo
- **Recursos**:
  - Busca por número de protocolo
  - Visualização de status atual
  - Histórico público de alterações
  - Informações básicas da demanda
- **Uso**: Para requerentes acompanharem suas solicitações

## 🔌 API Endpoints

### `GET /api/demands`
Listar todas as demandas

**Query Parameters:**
- `status`: Filtrar por status
- `priority`: Filtrar por prioridade
- `prefectureId`: Filtrar por prefeitura
- `assignedToId`: Filtrar por responsável

**Response:**
```json
[
  {
    "id": "...",
    "protocolNumber": "2026-000001",
    "title": "Solicitação de infraestrutura",
    "status": "ABERTA",
    "priority": "ALTA",
    "requesterName": "João Silva",
    "requesterEmail": "joao@email.com",
    "prefecture": { ... },
    "assignedTo": { ... },
    "createdAt": "...",
    "_count": { "history": 3 }
  }
]
```

### `POST /api/demands`
Criar nova demanda

**Body:**
```json
{
  "title": "Título da demanda",
  "description": "Descrição detalhada",
  "priority": "MEDIA",
  "requesterName": "João Silva",
  "requesterEmail": "joao@email.com",
  "requesterPhone": "(11) 99999-9999",
  "prefectureId": "...",
  "assignedToId": "...",
  "dueDate": "2026-03-15"
}
```

**Response:**
```json
{
  "id": "...",
  "protocolNumber": "2026-000001",
  "title": "...",
  ...
}
```

### `GET /api/demands/[id]`
Buscar detalhes de uma demanda

### `PATCH /api/demands/[id]`
Atualizar demanda

**Body:**
```json
{
  "status": "CONCLUIDA",
  "priority": "ALTA",
  "assignedToId": "...",
  "resolution": "Problema resolvido...",
  "internalNotes": "Notas internas..."
}
```

### `DELETE /api/demands/[id]`
Deletar demanda

### `GET /api/demands/protocol/[protocol]`
Buscar demanda por protocolo (público)

**Response (informações públicas):**
```json
{
  "protocolNumber": "2026-000001",
  "title": "...",
  "status": "EM_ANDAMENTO",
  "priority": "ALTA",
  "createdAt": "...",
  "updatedAt": "...",
  "resolvedAt": null,
  "prefecture": { ... },
  "history": [ ... ]
}
```

### `GET /api/demands/stats`
Estatísticas das demandas

**Response:**
```json
{
  "total": 150,
  "byStatus": {
    "ABERTA": 20,
    "EM_ANALISE": 15,
    "EM_ANDAMENTO": 30,
    "AGUARDANDO_RESPOSTA": 10,
    "CONCLUIDA": 70,
    "CANCELADA": 5
  },
  "byPriority": {
    "BAIXA": 40,
    "MEDIA": 60,
    "ALTA": 35,
    "URGENTE": 15
  },
  "byPrefecture": [ ... ],
  "recentDemands": [ ... ]
}
```

## 📧 Sistema de Notificações

### Email Automático - Nova Demanda
**Enviado para:** Requerente
**Quando:** Demanda é criada
**Conteúdo:**
- Número do protocolo
- Título da demanda
- Status inicial
- Informações da prefeitura (se aplicável)

### Email Automático - Demanda Concluída
**Enviado para:**
1. Requerente
2. Prefeitura (se relacionada)

**Quando:** Status muda para CONCLUIDA
**Conteúdo:**
- Número do protocolo
- Resolução da demanda
- Data de conclusão

### Notificação Interna - Demanda Atribuída
**Enviado para:** Usuário responsável
**Quando:** Demanda é atribuída ou reatribuída
**Conteúdo:**
- Título da demanda
- Protocolo
- Link para visualização

## 🎨 Componentes de Interface

### Board Kanban
- Colunas por status
- Drag & drop (futuro)
- Contadores por coluna
- Cards com informações resumidas

### Cards de Demanda
- Protocolo em destaque
- Badges de status e prioridade
- Informações do requerente
- Data de criação
- Prefeitura e responsável

### Formulário de Criação
- Validação de campos obrigatórios
- Validação de email
- Seleção de prefeitura
- Atribuição de responsável
- Sistema de prioridades

### Timeline de Histórico
- Eventos ordenados cronologicamente
- Ícones por tipo de ação
- Informações de mudanças (antes → depois)
- Comentários e observações

## 🔒 Segurança e Permissões

### Acesso Autenticado
- Todas as rotas de gerenciamento (`/api/demands/*`)
- Páginas internas (`/demandas/*`)

### Acesso Público
- Consulta de protocolo (`/consulta-protocolo`)
- Endpoint de busca por protocolo (informações limitadas)

### Auditoria
- Todas as ações são registradas em `audit_logs`
- Histórico completo em `demand_history`
- Rastreamento de IP e user agent

## 📊 Fluxo de Trabalho Típico

1. **Criação da Demanda**
   - Colaborador registra nova demanda
   - Sistema gera protocolo único
   - Email enviado ao requerente
   - Histórico inicial criado

2. **Análise e Atribuição**
   - Status alterado para EM_ANALISE
   - Responsável atribuído
   - Notificação enviada ao responsável

3. **Trabalho na Demanda**
   - Status alterado para EM_ANDAMENTO
   - Notas internas adicionadas
   - Comunicação com requerente se necessário

4. **Aguardando Resposta** (opcional)
   - Se precisar de informações do requerente
   - Status alterado para AGUARDANDO_RESPOSTA

5. **Conclusão**
   - Resolução documentada
   - Status alterado para CONCLUIDA
   - Emails de notificação enviados
   - Data de resolução registrada

## 🚀 Como Usar

### Para Criar uma Nova Demanda:

1. Acesse `/demandas`
2. Clique em "Nova Demanda"
3. Preencha o formulário
4. Clique em "Criar Demanda"
5. O protocolo será gerado automaticamente

### Para Acompanhar uma Demanda:

**Internamente:**
- Acesse `/demandas`
- Busque ou filtre a demanda
- Clique para ver detalhes

**Publicamente (requerente):**
- Acesse `/consulta-protocolo`
- Digite o número do protocolo
- Visualize o status e histórico

### Para Atualizar uma Demanda:

1. Acesse a demanda em `/demandas/[id]`
2. Clique em "Editar"
3. Atualize status, prioridade, resolução, etc.
4. Clique em "Salvar"
5. Histórico é atualizado automaticamente

## 📈 Métricas e Analytics

O módulo rastreia:
- Total de demandas
- Demandas por status
- Demandas por prioridade
- Demandas por prefeitura
- Tempo médio de resolução
- Taxa de conclusão

## 🛠️ Manutenção

### Arquivos Principais:
- Schema: `prisma/schema.prisma`
- APIs: `app/api/demands/**`
- Páginas: `app/(app)/demandas/**`
- Consulta Pública: `app/consulta-protocolo/page.tsx`
- Navegação: `components/layout/sidebar.tsx`

### Migrations:
- `20260308134757_add_demands_module` - Criação inicial do módulo

## ✅ Checklist de Funcionalidades

- [x] Schema de banco de dados
- [x] APIs REST completas
- [x] Página de listagem/board
- [x] Página de criação
- [x] Página de detalhes/edição
- [x] Consulta pública de protocolo
- [x] Sistema de notificações por email
- [x] Notificações internas
- [x] Histórico de alterações
- [x] Sistema de protocolo único
- [x] Filtros e busca
- [x] Estatísticas
- [x] Integração com sidebar
- [x] Auditoria completa

## 🎉 Módulo Completo e Funcional!

Desenvolvido em: 8 de março de 2026
Status: ✅ Pronto para uso
