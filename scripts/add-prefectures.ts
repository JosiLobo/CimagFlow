import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const prefectures = [
  { name: "Aiuruoca", city: "Aiuruoca", state: "MG" },
  { name: "Alagoa", city: "Alagoa", state: "MG" },
  { name: "Carmo de Minas", city: "Carmo de Minas", state: "MG" },
  { name: "Caxambu", city: "Caxambu", state: "MG" },
  { name: "Cruzília", city: "Cruzília", state: "MG" },
  { name: "Dom Viçoso", city: "Dom Viçoso", state: "MG" },
  { name: "Itamonte", city: "Itamonte", state: "MG" },
  { name: "Itanhandu", city: "Itanhandu", state: "MG" },
  { name: "Jesuânia", city: "Jesuânia", state: "MG" },
  { name: "Lambari", city: "Lambari", state: "MG" },
  { name: "Liberdade", city: "Liberdade", state: "MG" },
  { name: "Minduri", city: "Minduri", state: "MG" },
  { name: "Olímpio Noronha", city: "Olímpio Noronha", state: "MG" },
  { name: "Passa Quatro", city: "Passa Quatro", state: "MG" },
  { name: "Pouso Alto", city: "Pouso Alto", state: "MG" },
  { name: "São Lourenço", city: "São Lourenço", state: "MG" },
  { name: "São Thomé das Letras", city: "São Thomé das Letras", state: "MG" },
  { name: "Seritinga", city: "Seritinga", state: "MG" },
  { name: "Soledade de Minas", city: "Soledade de Minas", state: "MG" },
  { name: "São Sebastião do Rio Verde", city: "São Sebastião do Rio Verde", state: "MG" },
  { name: "Baependi", city: "Baependi", state: "MG" },
  { name: "Serranos", city: "Serranos", state: "MG" },
  { name: "Virgínia", city: "Virgínia", state: "MG" },
  { name: "Cambuquira", city: "Cambuquira", state: "MG" },
  { name: "Bocaina de Minas", city: "Bocaina de Minas", state: "MG" },
  { name: "Conceição do Rio Verde", city: "Conceição do Rio Verde", state: "MG" },
  { name: "Três Corações", city: "Três Corações", state: "MG" },
  { name: "Arantina", city: "Arantina", state: "MG" },
  { name: "Passa Vinte", city: "Passa Vinte", state: "MG" },
];

async function main() {
  console.log("🏛️  Adicionando prefeituras ao sistema...\n");

  let created = 0;
  let existing = 0;

  for (const prefecture of prefectures) {
    try {
      // Verificar se já existe uma prefeitura com a mesma cidade e estado
      const existingPrefecture = await prisma.prefecture.findFirst({
        where: {
          city: prefecture.city,
          state: prefecture.state,
        },
      });

      if (existingPrefecture) {
        console.log(`⚠️  ${prefecture.name} - ${prefecture.state} (já existe)`);
        existing++;
        continue;
      }

      // Criar nova prefeitura
      await prisma.prefecture.create({
        data: {
          name: `Prefeitura Municipal de ${prefecture.name}`,
          city: prefecture.city,
          state: prefecture.state,
        },
      });

      console.log(`✅ ${prefecture.name} - ${prefecture.state}`);
      created++;
    } catch (error) {
      console.error(`❌ Erro ao processar ${prefecture.name}:`, error);
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Prefeituras criadas: ${created}`);
  console.log(`   ⚠️  Já existiam: ${existing}`);
  console.log(`   📍 Total: ${prefectures.length}`);
  console.log(`\n🎉 Processo concluído!`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao adicionar prefeituras:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

