# 🔐 Credenciais de Acesso - Cimagflow

## 👤 Acesso Admin Fixo

### Credenciais Garantidas
```
Email:    admin@signflow.com
Senha:    admin123
```

## ⚡ Características

- **Acesso Garantido**: Estas credenciais SEMPRE funcionarão
- **Hardcoded**: Configuradas diretamente no código de autenticação
- **Permissões**: ADMIN completo
- **Bypass**: Não depende do banco de dados estar populado

## 📍 Onde Usar

- **URL Local**: http://localhost:3000
- **URL Produção**: Configure conforme seu ambiente de deploy

## 🔧 Implementação Técnica

### 1. Autenticação Hardcoded
Arquivo: `lib/auth-options.ts`
- Verificação antes da consulta ao banco
- Retorna usuário admin automaticamente
- Não requer hash de senha

### 2. Seed Database
Arquivo: `scripts/seed.ts`
- Cria/atualiza o usuário no banco
- Garante consistência dos dados
- Executar: `npm run db:seed`

## 🎯 Outras Contas Disponíveis

Após executar `npm run db:seed`:

| Email | Senha | Role |
|-------|-------|------|
| admin@signflow.com | admin123 | ADMIN |
| admin@cimagflow.com | admin123 | ADMIN |
| john@doe.com | johndoe123 | ADMIN |

## ⚠️ Aviso de Segurança

**IMPORTANTE PARA PRODUÇÃO:**
- Altere estas credenciais em ambiente de produção
- Use senhas fortes e únicas
- Implemente autenticação de dois fatores
- Monitore logs de acesso

## 🚀 Quick Start

```bash
# 1. Inicie o banco de dados
docker start cimagflow-postgres

# 2. Execute o seed (opcional, já está configurado)
npm run db:seed

# 3. Inicie o servidor
npm run dev

# 4. Acesse
# http://localhost:3001
# Email: admin@signflow.com
# Senha: admin123
```

## ✅ Status

- [x] Credenciais hardcoded implementadas
- [x] Usuário criado no banco via seed
- [x] Documentação atualizada
- [x] Testado e funcionando

---

**Última atualização:** 8 de março de 2026
