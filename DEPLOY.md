# ✅ Checklist de Deploy para Vercel

## Antes do Deploy

### 1. Banco de Dados PostgreSQL
- [ ] Criar banco de dados PostgreSQL em produção
  - Opções recomendadas:
    - ✅ [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
    - ✅ [Neon](https://neon.tech/) (Free tier generoso)
    - ✅ [Supabase](https://supabase.com/) (Free tier + features extras)
    - ✅ [Railway](https://railway.app/)
- [ ] Anotar a `DATABASE_URL` do banco de produção

### 2. Repositório Git
- [ ] Criar repositório no GitHub/GitLab/Bitbucket
- [ ] Fazer commit de todos os arquivos
- [ ] Push para o repositório remoto

```bash
git init
git add .
git commit -m "Initial commit - Cimagflow"
git remote add origin <sua-url-do-repositorio>
git push -u origin main
```

### 3. Gerar Chave Secreta
- [ ] Gerar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Deploy na Vercel

### 1. Criar Projeto na Vercel
- [ ] Acessar [vercel.com](https://vercel.com)
- [ ] Fazer login com GitHub/GitLab
- [ ] Clicar em "Add New Project"
- [ ] Selecionar o repositório do Cimagflow
- [ ] Clicar em "Import"

### 2. Configurar Variáveis de Ambiente

Na aba "Environment Variables", adicionar:

#### ✅ Obrigatórias

```env
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=<cole-a-chave-gerada>
NEXTAUTH_URL=https://seu-projeto.vercel.app
```

#### 🔧 Opcionais (AWS S3)

```env
AWS_PROFILE=hosted_storage
AWS_REGION=us-west-2
AWS_BUCKET_NAME=seu-bucket
AWS_FOLDER_PREFIX=pasta/
ABACUSAI_API_KEY=sua-chave
```

#### 📧 Opcionais (Notificações)

```env
WEB_APP_ID=seu-app-id
NOTIF_ID_DOCUMENTO_ENVIADO_PARA_ASSINATURA=notif-id
NOTIF_ID_LEMBRETE_DE_ASSINATURA_PENDENTE=notif-id
NOTIF_ID_DOCUMENTO_COMPLETAMENTE_ASSINADO=notif-id
```

### 3. Configurações de Build

A Vercel detectará automaticamente as configurações do `package.json`:

- ✅ **Framework Preset**: Next.js
- ✅ **Build Command**: `npm run build` (executa `prisma generate && next build`)
- ✅ **Output Directory**: `.next`
- ✅ **Install Command**: `npm install`

**Importante**: As migrações do banco de dados (`prisma migrate deploy`) devem ser executadas **APÓS** o primeiro deploy, não durante o build. Isso evita erros de conexão com o banco durante o processo de build.

### 4. Deploy

- [ ] Clicar em "Deploy"
- [ ] Aguardar build completar (3-5 minutos)
- [ ] Verificar logs de build para erros

## Após o Deploy

### 1. Executar Migrações (OBRIGATÓRIO - Primeiro Deploy)

**Importante**: Execute as migrações do banco APÓS o primeiro deploy bem-sucedido.

#### Opção 1: Via Vercel CLI (Recomendado)

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Login na Vercel
vercel login

# Link do projeto
vercel link

# Puxar variáveis de ambiente (incluindo DATABASE_URL)
vercel env pull .env.production

# Executar migrações usando a DATABASE_URL de produção
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx prisma migrate deploy
```

#### Opção 2: Via Local com DATABASE_URL de Produção

```bash
# Criar arquivo .env.production temporário
echo "DATABASE_URL=postgresql://user:password@host:port/database" > .env.production

# Executar migrações
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

#### Opção 3: Via Script Deploy do Vercel

Adicione um script no `package.json` (já incluído):

```json
"scripts": {
  "db:migrate": "prisma migrate deploy"
}
```

Execute após o deploy:
```bash
vercel env pull .env.production
npm run db:migrate
```

**Verificar se as migrações foram aplicadas:**

```bash
npx prisma migrate status
```

Você deve ver todas as 5 migrações listadas como aplicadas:
- ✅ 20260228215915_init
- ✅ 20260301001218_add_prefecture_to_folders
- ✅ 20260301004021_add_company_fields
- ✅ 20260301010000_update_bid_modalidades
- ✅ 20260301020000_add_testemunha_type

### 2. Popular Banco de Dados (Opcional)

Para criar usuário admin inicial:

```bash
# Conectar ao banco de produção
# Editar .env.production com DATABASE_URL de produção
npm run seed
```

Ou criar manualmente via SQL:

```sql
-- Criar usuário admin
INSERT INTO "users" (id, name, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'admin-id-123',
  'Admin',
  'admin@signflow.com',
  '$2a$10$hashed_password_here',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

### 3. Testar o Sistema

- [ ] Acessar o domínio da Vercel
- [ ] Fazer login com credenciais admin
- [ ] Testar funcionalidades principais:
  - [ ] Login/Logout
  - [ ] Dashboard
  - [ ] Criação de Prefeitura
  - [ ] Criação de Edital
  - [ ] Upload de Documento
  - [ ] Criação de Assinante

### 4. Configurar Domínio Customizado (Opcional)

- [ ] Na Vercel, ir em "Settings" > "Domains"
- [ ] Adicionar domínio customizado
- [ ] Configurar DNS conforme instruções
- [ ] Atualizar `NEXTAUTH_URL` com novo domínio

### 5. Monitoramento

- [ ] Verificar logs na Vercel Dashboard
- [ ] Configurar alertas (opcional)
- [ ] Monitorar uso de recursos

## Solução de Problemas Comuns

### ❌ Build Failed - Prisma

```bash
Error: Prisma Client could not be generated
```

**Solução**: Verificar se `postinstall` script está no package.json

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

### ❌ Database Connection Error

```bash
Error: Can't reach database server
```

**Solução**: 
1. Verificar DATABASE_URL nas variáveis de ambiente
2. Verificar se o banco permite conexões externas
3. Verificar credenciais e host

### ❌ NextAuth Error

```bash
[next-auth][error][MISSING_NEXTAUTH_API_ROUTE]
```

**Solução**: Verificar se `NEXTAUTH_URL` está configurado corretamente

### ❌ Module Not Found

```bash
Error: Cannot find module 'xyz'
```

**Solução**: 
1. Fazer rebuild: `vercel --prod`
2. Verificar se dependência está em `dependencies` (não `devDependencies`)

## Comandos Úteis Vercel CLI

```bash
# Ver logs em tempo real
vercel logs <deployment-url>

# Listar deploys
vercel ls

# Rollback para deploy anterior
vercel rollback <deployment-url>

# Executar comando no ambiente de produção
vercel env pull .env.production
```

## Checklist Final

- [ ] ✅ Banco de dados criado e acessível
- [ ] ✅ Todas variáveis de ambiente configuradas
- [ ] ✅ Deploy bem-sucedido
- [ ] ✅ Migrações executadas
- [ ] ✅ Usuário admin criado
- [ ] ✅ Login funcionando
- [ ] ✅ Todas funcionalidades testadas
- [ ] ✅ Domínio configurado (se aplicável)
- [ ] ✅ NEXTAUTH_URL atualizado com domínio final
- [ ] ✅ Credenciais de teste alteradas

## 🎉 Pronto para Produção!

Seu sistema Cimagflow está agora hospedado na Vercel e pronto para uso!

**URLs Importantes:**
- Dashboard Vercel: https://vercel.com/dashboard
- Documentação Vercel: https://vercel.com/docs
- Suporte Vercel: https://vercel.com/support
