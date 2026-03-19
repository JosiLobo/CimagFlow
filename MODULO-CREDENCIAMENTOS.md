# Módulo de Credenciamentos

## Visão Geral
Sistema completo de gerenciamento de credenciamentos de empresas, integrado ao CimagFlow. Permite que empresas submetam solicitações de credenciamento e que a equipe administrativa gerencie todo o processo de análise e aprovação.

## Funcionalidades Implementadas

### 1. Submissão Pública
- **Página:** `/nova-solicitacao` (Tab "Credenciamento")
- **Recursos:**
  - Formulário completo com dados da empresa
  - Upload de até 10 documentos (10MB cada)
  - Geração automática de protocolo (formato: CRED-YYYYMMDD-XXXX)
  - Envio de email de confirmação com protocolo

### 2. Gerenciamento Administrativo
- **Página de Listagem:** `/credenciamentos`
  - Visualização de todos os credenciamentos
  - Filtros por status, prioridade e prefeitura
  - Busca por protocolo, empresa, CNPJ, solicitante
  - Cards com estatísticas (Total, Pendentes, Em Análise, Aprovados, Reprovados)

- **Página de Detalhes:** `/credenciamentos/[id]`
  - 4 abas principais: Informações, Dados da Empresa, Documentos, Histórico
  - Controles de aprovação/reprovação
  - Atribuição de responsável e revisor
  - Gerenciamento de status e prioridade
  - Notas de análise
  - Download de documentos anexados

### 3. API Endpoints

#### `/api/credenciamentos` (GET/POST)
- **GET:** Lista credenciamentos com paginação e filtros
  - Parâmetros: page, status, search, prefectureId
  - Retorna: dados paginados + total de registros
- **POST:** Cria novo credenciamento (requer autenticação)

#### `/api/credenciamentos/[id]` (GET/PATCH/DELETE)
- **GET:** Retorna detalhes completos + histórico (últimas 50 entradas)
- **PATCH:** Atualiza credenciamento com registro automático de histórico
  - Status changes registram timestamps (approvedAt, rejectedAt)
  - Mudanças de status geram histórico automaticamente
- **DELETE:** Remove credenciamento com log de auditoria

#### `/api/credenciamentos/public` (POST)
- Endpoint público sem autenticação
- Valida campos obrigatórios
- Gera protocolo único
- Envia email de confirmação
- Define publicSubmission=true

## Estrutura de Dados

### Model: Credenciamento
```prisma
- id: String (UUID)
- protocolNumber: String (único, formato CRED-YYYYMMDD-XXXX)
- title: String
- description: String (opcional)
- status: CredenciamentoStatus (enum)
- priority: Priority (enum)

# Dados da Empresa
- companyName: String
- companyTradeName: String (opcional)
- cnpj: String
- companyAddress, companyCity, companyState, companyCEP: String
- companyPhone, companyEmail: String (opcional)

# Dados do Solicitante
- requesterName: String
- requesterEmail: String
- requesterPhone, requesterCPF, requesterCNPJ: String (opcional)

# Dados do Responsável Legal
- responsibleName, responsibleCPF, responsibleEmail, responsiblePhone: String (opcional)

# Informações de Credenciamento
- activityArea: String (opcional)
- requestedServices: String (opcional)

# Gestão
- prefectureId, assignedToId, reviewerId: String (opcional)
- analysisNotes: String (opcional)
- rejectionReason: String (opcional)
- attachments: String[] (URLs dos arquivos)

# Timestamps
- createdAt, updatedAt: DateTime
- approvedAt, rejectedAt: DateTime (opcional)
- publicSubmission: Boolean
```

### Model: CredenciamentoHistory
```prisma
- id: String (UUID)
- credenciamentoId: String
- userId: String (opcional)
- userName: String (opcional)
- action: String
- oldValue, newValue: String (opcional)
- comment: String (opcional)
- createdAt: DateTime
```

### Enum: CredenciamentoStatus
- PENDENTE
- EM_ANALISE
- APROVADO
- REPROVADO
- CANCELADO

## Fluxo de Trabalho

### 1. Submissão (Público)
1. Empresa acessa `/nova-solicitacao`
2. Seleciona tab "Credenciamento"
3. Preenche formulário completo
4. Anexa documentos necessários
5. Submete solicitação
6. Recebe confirmação com protocolo por email

### 2. Análise (Interno)
1. Colaborador acessa `/credenciamentos`
2. Visualiza lista de solicitações
3. Filtra/busca credenciamento desejado
4. Acessa detalhes do credenciamento
5. Atribui responsável/revisor
6. Altera status para "EM_ANALISE"
7. Adiciona notas de análise
8. Baixa e verifica documentos

### 3. Decisão (Interno)
**Aprovação:**
1. Clica em "Aprovar"
2. Confirma ação
3. Status alterado para "APROVADO"
4. approvedAt registrado
5. Histórico gerado automaticamente

**Reprovação:**
1. Preenche motivo da reprovação
2. Clica em "Reprovar"
3. Confirma ação
4. Status alterado para "REPROVADO"
5. rejectedAt registrado
6. Histórico gerado com motivo

## Integrações

### Auditoria
- Todas as operações geram logs de auditoria
- Histórico completo de mudanças
- Rastreamento de usuário responsável por cada ação

### Email
- Confirmação de submissão pública
- Template HTML responsivo
- Inclui protocolo e detalhes da solicitação

### Upload de Arquivos
- Integração com FileUpload component
- Suporte para múltiplos arquivos
- Limite: 10 arquivos, 10MB cada
- URLs armazenadas no array attachments

## Navegação

### Sidebar
- Item "Credenciamentos" adicionado ao menu principal
- Ícone: Building
- Disponível para usuários com permissão

### Breadcrumbs
- `/credenciamentos` - Listagem
- `/credenciamentos/[id]` - Detalhes do credenciamento

## Permissões
- **Público:** Pode submeter credenciamentos via `/nova-solicitacao`
- **Colaboradores:** Acesso completo ao módulo interno
- **Admins:** Acesso total incluindo exclusão

## Próximas Melhorias Sugeridas

1. **Notificações por Email:**
   - Notificar equipe quando nova solicitação chega
   - Notificar empresa quando status muda
   - Lembretes de solicitações pendentes

2. **Busca de Protocolo Público:**
   - Extender `/consulta-protocolo` para suportar CRED-*
   - Permitir empresa verificar status pelo protocolo

3. **Dashboard de Credenciamentos:**
   - Adicionar cards de credenciamentos no dashboard principal
   - Gráficos de aprovação/reprovação
   - Tempo médio de análise

4. **Integração com Editais:**
   - Vincular credenciamentos aprovados a editais
   - Lista de empresas aptas para chamadas públicas

5. **Renovação de Credenciamento:**
   - Sistema de validade/expiração
   - Processo de renovação simplificado

## Arquivos Criados/Modificados

### Novos Arquivos:
- `/app/(app)/credenciamentos/page.tsx` - Lista de credenciamentos
- `/app/(app)/credenciamentos/[id]/page.tsx` - Detalhes
- `/app/api/credenciamentos/route.ts` - API principal
- `/app/api/credenciamentos/[id]/route.ts` - API de item individual
- `/app/api/credenciamentos/public/route.ts` - API pública
- `/MODULO-CREDENCIAMENTOS.md` - Este documento

### Arquivos Modificados:
- `/prisma/schema.prisma` - Adicionados models Credenciamento e CredenciamentoHistory
- `/app/nova-solicitacao/page.tsx` - Adicionado tab de Credenciamento
- `/components/layout/sidebar.tsx` - Adicionado link do módulo
- Migration: `20260318231257_add_credenciamento_module`

## Comandos Executados

```bash
# Gerar migration
npx prisma migrate dev --name add_credenciamento_module

# Regenerar Prisma Client
npx prisma generate
```

## Status: ✅ Completo e Funcional
