# 🚀 Setup Rápido no Vercel

## Passo 1: Preparar Banco de Dados

Antes de fazer deploy, você precisa de um banco de dados PostgreSQL em produção.

### Opção Recomendada: Vercel Postgres

1. Acesse seu projeto na Vercel
2. Vá em **Storage** → **Create Database**
3. Selecione **Postgres**
4. Anote a `DATABASE_URL` que será gerada

### Outras Opções:
- **Neon**: https://neon.tech/ (Free tier generoso)
- **Supabase**: https://supabase.com/ (Free tier + features extras)
- **Railway**: https://railway.app/

## Passo 2: Deploy no Vercel

### 2.1 Importar Repositório

1. Acesse https://vercel.com/new
2. Importe o repositório: `framil09/CimagFlow`
3. **Não clique em Deploy ainda!**

### 2.2 Configurar Variáveis de Ambiente

Clique em **Environment Variables** e adicione:

#### ✅ OBRIGATÓRIAS

```env
DATABASE_URL=<cole-sua-database-url-aqui>
NEXTAUTH_SECRET=<gere-com-comando-abaixo>
NEXTAUTH_URL=https://seu-projeto.vercel.app
```

**Para gerar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

#### 🔧 OPCIONAIS (AWS S3 - apenas se for usar)

```env
AWS_PROFILE=hosted_storage
AWS_REGION=us-west-2
AWS_BUCKET_NAME=seu-bucket
AWS_FOLDER_PREFIX=pasta/
```

### 2.3 Fazer Deploy

1. Clique em **Deploy**
2. Aguarde 3-5 minutos
3. ✅ Deploy concluído!

## Passo 3: Executar Migrações do Banco de Dados

**IMPORTANTE**: Após o primeiro deploy, você DEVE rodar as migrações do banco.

### Método 1: Via Vercel Dashboard (Mais Fácil)

1. No Vercel Dashboard, vá em seu projeto
2. Vá em **Settings** → **Functions**
3. Crie uma função serverless temporária para rodar migrations:
   - Ou use a Vercel CLI abaixo

### Método 2: Via Vercel CLI (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Link do projeto
vercel link

# Puxar variáveis de ambiente
vercel env pull .env.production

# Executar migrações
npx prisma migrate deploy
```

### Verificar se Migrações Foram Aplicadas

```bash
npx prisma migrate status
```

Você deve ver 5 migrações aplicadas:
- ✅ 20260228215915_init
- ✅ 20260301001218_add_prefecture_to_folders
- ✅ 20260301004021_add_company_fields
- ✅ 20260301010000_update_bid_modalidades
- ✅ 20260301020000_add_testemunha_type

## Passo 4: Criar Usuário Admin (Primeiro Acesso)

### Opção 1: Via Prisma Studio

```bash
# Com .env.production configurado
npx prisma studio
```

Criar usuário manualmente na tabela `users`:
- **email**: admin@cimagflow.com
- **password**: (usar bcrypt para hash)
- **role**: ADMIN
- **isActive**: true

### Opção 2: Via SQL Direto

Conecte ao banco e execute:

```sql
INSERT INTO "users" (id, name, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Admin',
  'admin@cimagflow.com',
  '$2a$10$8K1p/RQb/x/NxuKKdDWX3.8OQJ3p0BqNXxUUcIu.qGYmH3K0JdO6u', -- senha: Admin@123
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

### Opção 3: Via Seed Script

```bash
# Editar DATABASE_URL no .env.production
npm run db:seed
```

## Passo 5: Atualizar NEXTAUTH_URL

Após o deploy, atualize a variável de ambiente com a URL real:

1. Vá em **Settings** → **Environment Variables**
2. Edite `NEXTAUTH_URL`
3. Altere para: `https://seu-projeto-real.vercel.app`
4. Clique em **Save**
5. Faça um **Redeploy** do projeto

## Passo 6: Testar o Sistema

Acesse sua URL do Vercel:
- Login: admin@cimagflow.com
- Senha: Admin@123 (ou a que você configurou)

### Checklist de Testes:

- [ ] ✅ Login funciona
- [ ] ✅ Dashboard carrega
- [ ] ✅ Criar Prefeitura
- [ ] ✅ Criar Edital
- [ ] ✅ Criar Pasta
- [ ] ✅ Criar Template
- [ ] ✅ Criar Empresa
- [ ] ✅ Criar Assinante

## 🎉 Pronto!

Seu sistema está no ar e funcionando!

---

## Troubleshooting

### ❌ Erro: "Prisma schema validation error"

**Causa**: DATABASE_URL não configurada ou incorreta

**Solução**: 
1. Verifique a variável de ambiente no Vercel
2. Certifique-se que a URL está no formato correto:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```

### ❌ Erro: "Can't reach database server"

**Causa**: Banco não permite conexões externas

**Solução**:
1. Configure o firewall do banco para aceitar conexões do Vercel
2. Para Vercel Postgres, isso é automático
3. Para outros providers, adicione o Vercel às whitelist IPs

### ❌ Erro: "NextAuth configuration error"

**Causa**: NEXTAUTH_URL incorreto ou NEXTAUTH_SECRET ausente

**Solução**:
1. Verifique se ambas variáveis estão configuradas
2. `NEXTAUTH_URL` deve ser a URL completa com https://
3. Faça redeploy após alterar

### ❌ Página em Branco ou 500 Error

**Causa**: Migrações não foram executadas

**Solução**:
1. Execute `npx prisma migrate deploy`
2. Verifique com `npx prisma migrate status`
3. Faça redeploy

### ❌ Build Falhou com Erro de Dependências

**Causa**: Conflito de versões de pacotes

**Solução**:
1. Já resolvido no commit mais recente
2. Faça novo deploy do repositório atualizado

---

## Links Úteis

- 📚 [Documentação Vercel](https://vercel.com/docs)
- 🗄️ [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- 🔐 [NextAuth.js Docs](https://next-auth.js.org/)
- 🛠️ [Prisma Deploy Guide](https://www.prisma.io/docs/guides/deployment)

## Suporte

Se encontrar problemas:
1. Verifique os logs no Vercel Dashboard
2. Consulte este guia de troubleshooting
3. Revise a documentação completa em `DEPLOY.md`
