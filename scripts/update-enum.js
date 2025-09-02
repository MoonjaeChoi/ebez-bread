// Prisma를 사용한 enum 업데이트 스크립트
const { PrismaClient } = require('@prisma/client');

async function updateEnum() {
  const prisma = new PrismaClient();

  try {
    console.log('Checking current enum values...');
    
    // 현재 enum 값들 확인
    const result = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'ReportStatus'
      ORDER BY enumlabel;
    `;
    
    const currentValues = result.map(row => row.enumlabel);
    console.log('Current enum values:', currentValues);
    
    if (!currentValues.includes('DEPARTMENT_APPROVED')) {
      console.log('Adding DEPARTMENT_APPROVED to ReportStatus enum...');
      
      await prisma.$executeRaw`
        ALTER TYPE "ReportStatus" ADD VALUE 'DEPARTMENT_APPROVED';
      `;
      
      console.log('✅ Successfully added DEPARTMENT_APPROVED to ReportStatus enum');
    } else {
      console.log('✅ DEPARTMENT_APPROVED already exists in ReportStatus enum');
    }
    
  } catch (error) {
    console.error('❌ Error updating enum:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateEnum();