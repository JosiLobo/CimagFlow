# 🌐 Sistema de Demandas Públicas

## 📋 Visão Geral

Sistema que permite que **qualquer pessoa ou prefeitura abra demandas SEM precisar fazer login**, tornando o processo completamente público e acessível.

## 🎯 Funcionalidades

### Para Cidadãos/Prefeituras (Público)

#### 1. **Landing Page Pública** 
- **URL:** `/` (página inicial)
- **Características:**
  - Design moderno e atrativo
  - Botão destacado "Abrir Nova Demanda"
  - Link para consulta de protocolo
  - Informações sobre o sistema
  - Acesso ao login interno

#### 2. **Abrir Demanda Pública**
- **URL:** `/abrir-demanda`
- **Acesso:** Público (sem login necessário)
- **Campos do Formulário:**
  - **Prefeitura** (seleção obrigatória)
  - **Título da Demanda** (obrigatório)
  - **Descrição Detalhada** (obrigatório)
  - **Prioridade** (Baixa, Média, Alta, Urgente)
  - **Dados do Requerente:**
    - Nome completo (obrigatório)
    - Email (obrigatório)
    - Telefone (opcional)
    - CPF (opcional)

#### 3. **Confirmação e Protocolo**
Após enviar a demanda:
- ✅ Geração automática do protocolo (formato: `YYYY-NNNNNN`)
- ✅ Tela de sucesso com número do protocolo destacado
- ✅ Email de confirmação automático com:
  - Número do protocolo
  - Detalhes da demanda
  - Link para consulta
  - Status inicial
- ✅ Botão para consultar demanda
- ✅ Opção para abrir nova demanda

#### 4. **Consulta Pública de Protocolo**
- **URL:** `/consulta-protocolo`
- **Acesso:** Público
- **Funcionalidades:**
  - Busca por número de protocolo
  - Visualização de status
  - Histórico de atualizações
  - Informações públicas da demanda

### Para Equipe Interna (Autenticado)

#### 5. **Gestão Interna**
- **URL:** `/demandas`
- **Acesso:** Requer login
- **Funcionalidades:**
  - Visualizar todas as demandas (públicas e internas)
  - Filtrar por origem (flag `publicSubmission`)
  - Board Kanban com 6 status
  - Atribuir responsáveis
  - Mudar status e prioridade
  - Adicionar notas internas
  - Registrar resolução
  - Histórico completo de alterações

## 🔧 Implementação Técnica

### Estrutura de Arquivos

```
app/
├── page.tsx                           # Landing page pública
├── abrir-demanda/
│   └── page.tsx                      # Formulário público
├── consulta-protocolo/
│   └── page.tsx                      # Consulta pública
├── (app)/
│   └── demandas/                     # Gestão interna
│       ├── page.tsx                  # Lista/Board
│       ├── nova/page.tsx             # Criar (interna)
│       └── [id]/page.tsx             # Detalhes
└── api/
    └── demands/
        ├── route.ts                  # APIs autenticadas
        ├── public/
        │   └── route.ts             # API pública
        ├── protocol/[protocol]/
        │   └── route.ts             # Consulta pública
        └── stats/route.ts           # Estatísticas
```

### Database Schema

```prisma
model Demand {
  id               String         @id @default(cuid())
  protocolNumber   String         @unique
  title            String
  description      String         @db.Text
  status           DemandStatus   @default(ABERTA)
  priority         DemandPriority @default(MEDIA)
  
  // Dados do Requerente
  requesterName    String
  requesterEmail   String
  requesterPhone   String?
  requesterCpf     String?
  
  // Relacionamentos
  prefectureId     String?
  assignedToId     String?
  createdBy        String?        // Opcional para demandas públicas
  
  // Flags
  publicSubmission Boolean        @default(false) // 🆕 Identifica origem
  
  // ... outros campos
}
```

### API Endpoints

#### Público (sem autenticação)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/demands/public` | Criar demanda pública |
| `GET` | `/api/demands/protocol/:protocol` | Consultar por protocolo |

#### Protegido (requer autenticação)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/demands` | Listar todas as demandas |
| `POST` | `/api/demands` | Criar demanda interna |
| `GET` | `/api/demands/:id` | Obter detalhes |
| `PATCH` | `/api/demands/:id` | Atualizar demanda |
| `DELETE` | `/api/demands/:id` | Excluir demanda |
| `GET` | `/api/demands/stats` | Estatísticas |

### Middleware Configuration

```typescript
// middleware.ts - Rotas públicas
pathname.startsWith("/abrir-demanda") ||
pathname.startsWith("/consulta-protocolo") ||
pathname.startsWith("/api/demands/public") ||
pathname.startsWith("/api/demands/protocol")
```

## 📧 Sistema de Emails

### Email de Confirmação (Automático)
Enviado para o requerente após criar demanda:
- **Assunto:** `Demanda Registrada - Protocolo XXXXXXXXXX`
- **Conteúdo:**
  - Número do protocolo (destaque)
  - Detalhes da demanda
  - Status atual
  - Próximos passos
  - Link para consulta

### Email de Atualização
Enviado quando o status muda (especialmente ao concluir):
- **Assunto:** `Demanda [Protocolo] - Status Atualizado`
- **Conteúdo:**
  - Novo status
  - Resolução (se aplicável)
  - Link para consulta

## 🎨 Experiência do Usuário

### Fluxo Completo

```mermaid
graph TD
    A[Usuário acessa /] --> B{Logado?}
    B -->|Não| C[Landing Page]
    B -->|Sim| D[Dashboard]
    
    C --> E[Clica: Abrir Nova Demanda]
    E --> F[Formulário /abrir-demanda]
    F --> G[Preenche dados]
    G --> H[Envia]
    
    H --> I[API: POST /api/demands/public]
    I --> J[Gera Protocolo]
    J --> K[Salva no banco]
    K --> L[Envia Email]
    L --> M[Cria Notificação Interna]
    
    M --> N[Tela de Sucesso]
    N --> O{Ação?}
    O -->|Consultar| P[/consulta-protocolo]
    O -->|Nova Demanda| F
    
    P --> Q[Busca por Protocolo]
    Q --> R[API: GET /api/demands/protocol/:n]
    R --> S[Exibe Status e Histórico]
```

## 🔐 Segurança

### Proteções Implementadas

1. **Validação de Dados:**
   - Email válido (regex)
   - Campos obrigatórios
   - Prefeitura existe no banco

2. **Rate Limiting:** (Recomendado implementar)
   - Limitar criação de demandas por IP
   - Prevenir spam

3. **Sanitização:**
   - Todos os inputs são sanitizados
   - Proteção contra XSS

4. **Separação de Contexto:**
   - Flag `publicSubmission` identifica origem
   - APIs separadas (público vs autenticado)

## 📊 Análise e Métricas

### Dados Rastreáveis

- Total de demandas públicas vs internas
- Taxa de conversão (abertura → conclusão)
- Tempo médio de resolução
- Prefeituras mais ativas
- Horários de pico de solicitações

### Consultas Úteis

```typescript
// Demandas públicas abertas hoje
const publicDemands = await prisma.demand.count({
  where: {
    publicSubmission: true,
    createdAt: {
      gte: new Date(new Date().setHours(0, 0, 0, 0))
    }
  }
});

// Taxa de conclusão de demandas públicas
const stats = await prisma.demand.groupBy({
  by: ['status', 'publicSubmission'],
  _count: true
});
```

## 🚀 Próximas Melhorias

### Sugestões Futuras

1. **Upload de Arquivos:**
   - Permitir anexos nas demandas públicas
   - Limitar tamanho e tipos

2. **Autenticação Opcional:**
   - Criar conta para acompanhar múltiplas demandas
   - Histórico pessoal

3. **Chat/Comentários:**
   - Comunicação direta entre requerente e equipe
   - Notificações em tempo real

4. **Dashboard Público:**
   - Estatísticas gerais (anônimas)
   - Tempo médio de atendimento por prefeitura

5. **Integração WhatsApp:**
   - Notificações via WhatsApp
   - Bot para consulta de protocolo

6. **API Pública:**
   - Webhook para sistemas externos
   - Integração com outros sistemas municipais

## 📱 URLs Importantes

| Página | URL | Acesso |
|--------|-----|--------|
| Landing Page | `/` | Público |
| Abrir Demanda | `/abrir-demanda` | Público |
| Consultar Protocolo | `/consulta-protocolo` | Público |
| Login Sistema | `/login` | Público |
| Dashboard | `/dashboard` | Autenticado |
| Gestão Demandas | `/demandas` | Autenticado |

## 🎉 Benefícios

### Para Cidadãos

✅ Sem necessidade de criar conta  
✅ Processo rápido (menos de 2 minutos)  
✅ Protocolo imediato  
✅ Recebe atualizações por email  
✅ Pode consultar status a qualquer hora  

### Para Prefeituras

✅ Centraliza solicitações de múltiplas prefeituras  
✅ Reduz carga telefônica e presencial  
✅ Rastreabilidade completa  
✅ Métricas de atendimento  
✅ Histórico auditável  

### Para Equipe

✅ Organização visual (Kanban)  
✅ Priorização clara  
✅ Atribuição de responsáveis  
✅ Comunicação automática  
✅ Menos trabalho manual  

## 🔄 Workflow Interno

Quando uma demanda pública é criada:

1. **Notificação criada** para administrador
2. **Email enviado** para requerente
3. **Status inicial:** ABERTA
4. Equipe pode:
   - Atribuir responsável
   - Mudar para: EM_ANALISE → EM_ANDAMENTO → CONCLUIDA
   - Adicionar notas internas
   - Registrar resolução
5. **Email automático** ao concluir

## 📝 Exemplo de Uso

### Cenário: Cidadão solicita documento

1. Acessa **/** → Clica "Abrir Nova Demanda"
2. Preenche:
   - Prefeitura: "Prefeitura Municipal de São Paulo"
   - Título: "Solicitação de Certidão Negativa"
   - Descrição: "Preciso de certidão negativa de débitos..."
   - Nome: "João Silva"
   - Email: "joao@email.com"
   - Prioridade: Alta
3. Clica "Enviar Demanda"
4. **Recebe protocolo:** `2026000042`
5. Email chega em segundos
6. Pode consultar em `/consulta-protocolo?protocol=2026000042`
7. Equipe recebe notificação interna
8. Responsável processa e atualiza
9. João recebe email: "Sua demanda foi concluída!"

---

**Sistema 100% funcional e pronto para uso! 🚀**
