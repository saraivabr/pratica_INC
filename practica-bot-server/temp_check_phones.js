const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const corretores = await prisma.corretor.findMany({
    select: { whatsapp: true, nome: true }
  })
  console.log("Telefones no banco:")
  corretores.forEach(c => console.log(`${c.nome}: ${c.whatsapp}`))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
