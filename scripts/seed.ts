import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user (default test account)
  const adminPassword = await bcrypt.hash("johndoe123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      name: "John Doe",
      email: "john@doe.com",
      password: adminPassword,
      role: "ADMIN",
      phone: "11999999999",
    },
  });

  // Create CimagFlow admin
  const sfPassword = await bcrypt.hash("admin123", 12);
  const sfAdmin = await prisma.user.upsert({
    where: { email: "admin@cimagflow.com" },
    update: {},
    create: {
      name: "Administrador CimagFlow",
      email: "admin@cimagflow.com",
      password: sfPassword,
      role: "ADMIN",
      phone: "11988888888",
    },
  });

  // 🔐 CREDENCIAIS FIXAS - ACESSO ADMIN GARANTIDO
  // Email: admin@signflow.com | Senha: admin123
  // Este usuário SEMPRE terá acesso ao sistema
  const signflowPassword = await bcrypt.hash("admin123", 12);
  const signflowAdmin = await prisma.user.upsert({
    where: { email: "admin@signflow.com" },
    update: { 
      password: signflowPassword,
      role: "ADMIN",
      isActive: true,
      name: "Administrador SignFlow",
      phone: "11977777777",
    },
    create: {
      name: "Administrador SignFlow",
      email: "admin@signflow.com",
      password: signflowPassword,
      role: "ADMIN",
      phone: "11977777777",
      isActive: true,
    },
  });
  
  console.log("✅ Usuário admin fixo criado/atualizado:");
  console.log("   Email: admin@signflow.com");
  console.log("   Senha: admin123");

  // Create sample signers
  const signerData = [
    { name: "Carlos Eduardo Silva", email: "carlos.silva@prefeitura.sp.gov.br", phone: "11999110001", cpf: "123.456.789-00", type: "PREFEITO" as const, municipality: "São Paulo", company: "Prefeitura de São Paulo" },
    { name: "Maria José Santos", email: "maria.santos@empresa.com.br", phone: "11999110002", cpf: "234.567.890-01", type: "FORNECEDOR" as const, municipality: "São Paulo", company: "Santos Construções Ltda" },
    { name: "João Oliveira", email: "joao.oliveira@juridico.com", phone: "11999110003", cpf: "345.678.901-02", type: "JURIDICO" as const, municipality: "Campinas", company: "Oliveira Advocacia" },
    { name: "Ana Paula Ferreira", email: "ana.ferreira@prefeitura.rj.gov.br", phone: "21999110004", cpf: "456.789.012-03", type: "PREFEITO" as const, municipality: "Rio de Janeiro", company: "Prefeitura do Rio de Janeiro" },
    { name: "Roberto Costa", email: "roberto.costa@fornecedores.com", phone: "11999110005", cpf: "567.890.123-04", type: "FORNECEDOR" as const, municipality: "Santos", company: "Costa Serviços Gerais" },
  ];

  const signers = [];
  for (const s of signerData) {
    const signer = await prisma.signer.upsert({
      where: { id: s.cpf.replace(/\D/g, "") },
      update: {},
      create: { ...s, id: s.cpf.replace(/\D/g, "") },
    }).catch(async () => {
      return await prisma.signer.create({ data: s });
    });
    signers.push(signer);
  }

  // Create templates
  await prisma.template.upsert({
    where: { id: "template-contrato-servicos" },
    update: {},
    create: {
      id: "template-contrato-servicos",
      name: "Contrato de Prestação de Serviços",
      description: "Template padrão para contratos de prestação de serviços municipais",
      content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº {numero_contrato}/{ano}

MUNICÍPIO DE {municipio}
CNPJ: {cnpj_prefeitura}

CONTRATANTE: Prefeitura Municipal de {municipio}, representada por seu Prefeito(a) {nome_prefeito}.

CONTRATADA: {empresa}, estabelecida em {municipio}, inscrita no CNPJ sob nº {cnpj_empresa}, neste ato representada por {nome_representante}.

Cláusula 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de {descricao_servicos}.

Cláusula 2ª - DO VALOR
Pelo serviço prestado, a CONTRATANTE pagará o valor de R$ {valor_contrato}.

Cláusula 3ª - DO PRAZO
O presente contrato vigorará pelo prazo de {prazo_contrato}, a partir da data de assinatura.

Cláusula 4ª - DA ASSINATURA
As partes abaixo assinam o presente contrato em {municipio}, {data_atual}.

_______________________________
{nome_prefeito}
Prefeito(a) Municipal

_______________________________
{nome_representante}
Representante Legal - {empresa}`,
      variables: ["municipio", "ano", "numero_contrato", "cnpj_prefeitura", "nome_prefeito", "empresa", "cnpj_empresa", "nome_representante", "descricao_servicos", "valor_contrato", "prazo_contrato", "data_atual"],
      createdBy: admin.id,
    },
  });

  await prisma.template.upsert({
    where: { id: "template-edital-licitacao" },
    update: {},
    create: {
      id: "template-edital-licitacao",
      name: "Edital de Licitação",
      description: "Template para editais de licitação pública",
      content: `EDITAL DE LICITAÇÃO Nº {edital}/{ano}
Modalidade: {modalidade}

PREFEITURA MUNICIPAL DE {municipio}

A Prefeitura Municipal de {municipio} torna pública a abertura de licitação na modalidade {modalidade} para {objeto_licitacao}.

DATA DE ABERTURA: {data_abertura}
HORÁRIO: {horario}
LOCAL: {local}

VALOR MÁXIMO: R$ {valor_maximo}

Documentos necessários: {documentos_necessarios}

{municipio}, {data_atual}

_______________________________
{nome_prefeito}
Prefeito(a) Municipal`,
      variables: ["edital", "ano", "municipio", "modalidade", "objeto_licitacao", "data_abertura", "horario", "local", "valor_maximo", "documentos_necessarios", "nome_prefeito", "data_atual"],
      createdBy: admin.id,
    },
  });

  console.log("\n✅ Seed concluído!");
  console.log(`  Admin CimagFlow: admin@cimagflow.com / admin123`);
  console.log(`  Admin SignFlow: admin@signflow.com / admin123`);
  console.log(`  ${signers.length} assinantes criados`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
