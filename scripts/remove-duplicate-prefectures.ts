import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function removeDuplicates() {
  try {
    console.log("🔍 Buscando prefeituras duplicadas...\n");

    // Buscar todas as prefeituras
    const allPrefectures = await prisma.prefecture.findMany({
      orderBy: { createdAt: "asc" }, // Pegar as mais antigas primeiro
    });

    console.log(`📊 Total de prefeituras no banco: ${allPrefectures.length}\n`);

    // Agrupar por city + state
    const uniqueMap = new Map<string, any>();
    const duplicatesToDelete: string[] = [];

    for (const prefecture of allPrefectures) {
      const key = `${prefecture.city}-${prefecture.state}`;

      if (!uniqueMap.has(key)) {
        // Primeira ocorrência, manter
        uniqueMap.set(key, prefecture);
      } else {
        // Duplicata, marcar para deletar
        duplicatesToDelete.push(prefecture.id);
        console.log(
          `⚠️  Duplicata encontrada: ${prefecture.name} (${prefecture.city}/${prefecture.state}) - ID: ${prefecture.id}`
        );
      }
    }

    console.log(`\n🗑️  Total de duplicatas a remover: ${duplicatesToDelete.length}\n`);

    if (duplicatesToDelete.length > 0) {
      // Remover duplicatas
      const deleteResult = await prisma.prefecture.deleteMany({
        where: {
          id: {
            in: duplicatesToDelete,
          },
        },
      });

      console.log(`✅ ${deleteResult.count} prefeituras duplicadas removidas com sucesso!\n`);
    } else {
      console.log("✨ Nenhuma duplicata encontrada!\n");
    }

    // Mostrar resultado final
    const remaining = await prisma.prefecture.count();
    console.log(`📍 Total de prefeituras únicas restantes: ${remaining}\n`);

    console.log("🎉 Processo concluído!");
  } catch (error) {
    console.error("❌ Erro ao remover duplicatas:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicates();
