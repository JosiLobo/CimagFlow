import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Durante o build (npm run build), o Prisma Client não precisa de DATABASE_URL
// porque é apenas para análise estática. Mas em runtime, DATABASE_URL é obrigatória.
const isProd = process.env.NODE_ENV === 'production'
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

if (!process.env.DATABASE_URL && !isBuild && isProd) {
  throw new Error(
    'DATABASE_URL não está definida. Configure essa variável de ambiente antes de iniciar a aplicação.'
  )
}

const createPrismaClient = () => {
  // Durante build, retornar um objeto mock
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL não definida - usando Prisma Client mock para build')
    return new PrismaClient() // Mock para build - não será usado
  }
  
  return new PrismaClient({
    log: isProd ? ['error'] : ['query', 'error', 'warn'],
  })
}

export const prisma = global.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma

