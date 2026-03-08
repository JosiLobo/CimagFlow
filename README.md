# Cimagflow - Sistema de Gestão de Documentos e Assinaturas

Sistema completo de gestão de documentos, editais, assinantes e prefeituras com funcionalidades de assinatura digital.

## 🚀 Tecnologias

- **Next.js 14.2.28** - Framework React para produção
- **TypeScript** - Tipagem estática
- **Prisma ORM** - ORM para PostgreSQL
- **NextAuth.js** - Autenticação
- **Tailwind CSS** - Estilização
- **Framer Motion** - Animações
- **AWS S3** - Armazenamento de arquivos

## 📋 Funcionalidades

- ✅ Gestão de Usuários e Autenticação
- ✅ Gestão de Prefeituras
- ✅ Gestão de Editais (14 modalidades)
- ✅ Gestão de Empresas Fornecedoras
- ✅ Gestão de Documentos e Templates
- ✅ Gestão de Assinantes (Fornecedor, Prefeito, Jurídico, Testemunha)
- ✅ Sistema de Pastas com associação à Prefeituras
- ✅ Fluxo de Assinatura Digital
- ✅ Notificações e Lembretes
- ✅ Logs de Auditoria
- ✅ Analytics e Dashboard

## 🛠️ Configuração Local

### Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd Cimagflow
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
- `DATABASE_URL`: URL do seu banco PostgreSQL
- `NEXTAUTH_SECRET`: Chave secreta para NextAuth (gere com `openssl rand -base64 32`)
- Outras variáveis conforme necessário

4. Execute as migrações do banco de dados:
```bash
npx prisma migrate deploy
npx prisma generate
```

5. (Opcional) Popule o banco com dados iniciais:
```bash
npm run seed
```

6. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O aplicativo estará disponível em [http://localhost:3000](http://localhost:3000)

## 🌐 Deploy na Vercel

### Passo a Passo

1. **Prepare o banco de dados PostgreSQL**
   - Crie um banco PostgreSQL (recomendado: Vercel Postgres, Neon, Supabase)
   - Anote a `DATABASE_URL`

2. **Configure o projeto na Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login e clique em "Add New Project"
   - Importe seu repositório do GitHub/GitLab/Bitbucket

3. **Configure as variáveis de ambiente**
   
   Na Vercel, adicione as seguintes variáveis:
   
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=<gere-uma-chave-secreta>
   NEXTAUTH_URL=https://seu-dominio.vercel.app
   
   # Opcionais (se usar AWS S3)
   AWS_PROFILE=hosted_storage
   AWS_REGION=us-west-2
   AWS_BUCKET_NAME=seu-bucket
   AWS_FOLDER_PREFIX=pasta/
   ABACUSAI_API_KEY=sua-chave
   ```

4. **Configure os comandos de build**
   
   A Vercel detectará automaticamente os comandos do `package.json`:
   - Build Command: `npm run build` ou `prisma generate && next build`
   - Install Command: `npm install`
   - Output Directory: `.next`

5. **Adicione o script de build no package.json** (se necessário):
   
   ```json
   {
     "scripts": {
       "build": "prisma generate && next build"
     }
   }
   ```

6. **Execute as migrações do banco**
   
   Após o primeiro deploy, execute as migrações:
   ```bash
   # Instale a Vercel CLI
   npm i -g vercel
   
   # Faça login
   vercel login
   
   # Execute as migrações
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

7. **Deploy!**
   - Clique em "Deploy"
   - Aguarde a build completar
   - Acesse seu aplicativo no domínio fornecido

### Migrações Automáticas

Para executar migrações automaticamente a cada deploy, adicione ao `package.json`:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## 📝 Credenciais Padrão

🔐 **Acesso Garantido** (Hardcoded):

- **Email**: admin@signflow.com
- **Senha**: admin123

> ✅ Estas credenciais SEMPRE funcionarão, mesmo sem banco de dados populado.
> 📄 Para mais detalhes, veja [CREDENCIAIS-ACESSO.md](CREDENCIAIS-ACESSO.md)

⚠️ **IMPORTANTE**: Altere essas credenciais em produção!

## 🗂️ Estrutura do Projeto

```
Cimagflow/
├── app/                    # Rotas e páginas do Next.js App Router
│   ├── (app)/             # Rotas autenticadas
│   │   ├── dashboard/
│   │   ├── editais/
│   │   ├── empresas/
│   │   ├── documentos/
│   │   ├── assinantes/
│   │   ├── pastas/
│   │   └── ...
│   ├── api/               # API Routes
│   └── login/             # Página de login
├── components/            # Componentes React reutilizáveis
├── lib/                   # Utilitários e configurações
├── prisma/               # Schema e migrações do Prisma
├── public/               # Arquivos estáticos
└── scripts/              # Scripts auxiliares
```

## 🔒 Segurança

- Todas as rotas autenticadas requerem login
- Senhas são hasheadas com bcrypt
- Tokens JWT para sessões
- Validação de entrada em todas as APIs
- Log de auditoria de todas as ações

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- Desktop
- Tablet
- Mobile

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
```bash
# Verifique se o PostgreSQL está rodando
# Verifique a DATABASE_URL no .env
```

### Erro "Prisma Client not generated"
```bash
npx prisma generate
```

### Porta 3000 em uso
O projeto automaticamente tentará a porta 3001 se 3000 estiver ocupada.

## 📄 Licença

Este projeto é privado e confidencial.

## 👥 Suporte

Para questões e suporte, entre em contato com a equipe de desenvolvimento.
