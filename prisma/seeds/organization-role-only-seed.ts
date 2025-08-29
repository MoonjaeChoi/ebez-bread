import { PrismaClient } from '@prisma/client'
import { seedOrganizationRoles } from './organization-role-seed'

const prisma = new PrismaClient()

async function main() {
  console.log('🎭 Starting organization roles seeding...')

  // 첫 번째 교회 찾기
  const church = await prisma.church.findFirst()
  
  if (!church) {
    console.error('❌ No church found. Please run the main seed first.')
    return
  }

  console.log(`✅ Found church: ${church.name}`)

  // 조직 직책 시딩
  await seedOrganizationRoles(church.id)

  console.log('🎉 Organization roles seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })