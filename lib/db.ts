import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Force TypeScript to reload types after schema changes

const isProd = process.env.NODE_ENV === 'production'
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
const isBuildCommand =
  process.env.npm_lifecycle_event === 'build' ||
  process.argv.some((arg) => arg.includes('next') || arg === 'build')
const isBuildLike = isBuild || isBuildCommand
const defaultConnectionLimit = process.env.PRISMA_CONNECTION_LIMIT ?? '3'
const defaultPoolTimeout = process.env.PRISMA_POOL_TIMEOUT ?? '20'

// Em build, não forçamos DATABASE_URL para evitar falha de compilação.
// Em runtime de produção, DATABASE_URL é obrigatória.
if (!process.env.DATABASE_URL && !isBuildLike && isProd) {
  throw new Error(
    'DATABASE_URL não está definida. Configure essa variável de ambiente antes de iniciar a aplicação.'
  )
}

const createPrismaClient = () => {
  if (!process.env.DATABASE_URL && isBuildLike) {
    // Placeholder apenas para satisfazer inicialização do Prisma em build.
    process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
  }

  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) {
    throw new Error('DATABASE_URL não está definida.')
  }

  // Evita excesso de conexões no RDS limitando o pool por instância.
  const dbUrl = (() => {
    try {
      const parsed = new URL(rawUrl)
      if (parsed.protocol.startsWith('postgres')) {
        if (!parsed.searchParams.has('connection_limit')) {
          parsed.searchParams.set('connection_limit', defaultConnectionLimit)
        }
        if (!parsed.searchParams.has('pool_timeout')) {
          parsed.searchParams.set('pool_timeout', defaultPoolTimeout)
        }
      }
      return parsed.toString()
    } catch {
      return rawUrl
    }
  })()

  return new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: isProd ? ['error'] : ['error', 'warn'],
  })
}

export const prisma = global.prisma ?? createPrismaClient()

global.prisma = prisma

export default prisma
