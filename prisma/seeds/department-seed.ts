import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 샘플 부서 데이터
const departments = [
  // 최상위 부서들
  { name: '목회부', description: '목회 관련 업무를 담당하는 부서', parentId: null },
  { name: '행정부', description: '교회 행정 업무를 담당하는 부서', parentId: null },
  { name: '교육부', description: '교육 프로그램 운영을 담당하는 부서', parentId: null },
  { name: '선교부', description: '국내외 선교 활동을 담당하는 부서', parentId: null },
  { name: '문화부', description: '문화 및 예술 활동을 담당하는 부서', parentId: null },
  { name: '시설부', description: '교회 시설 관리를 담당하는 부서', parentId: null },
  { name: '재정부', description: '교회 재정 관리를 담당하는 부서', parentId: null },
  
  // 목회부 하위 부서들
  { name: '목양팀', description: '교인 목양과 상담을 담당', parentName: '목회부' },
  { name: '예배팀', description: '예배 준비와 진행을 담당', parentName: '목회부' },
  { name: '기도회팀', description: '각종 기도회 운영을 담당', parentName: '목회부' },
  
  // 행정부 하위 부서들
  { name: '총무팀', description: '교회 전반적인 행정업무 담당', parentName: '행정부' },
  { name: '인사팀', description: '교역자 및 직원 관리', parentName: '행정부' },
  { name: '문서관리팀', description: '각종 문서 및 기록 관리', parentName: '행정부' },
  
  // 교육부 하위 부서들
  { name: '주일학교팀', description: '어린이 주일학교 운영', parentName: '교육부' },
  { name: '청소년부팀', description: '중고등부 프로그램 운영', parentName: '교육부' },
  { name: '청년부팀', description: '청년 사역 및 프로그램 운영', parentName: '교육부' },
  { name: '장년교육팀', description: '장년 교육 프로그램 운영', parentName: '교육부' },
  
  // 선교부 하위 부서들
  { name: '국내선교팀', description: '국내 선교 활동 계획 및 실행', parentName: '선교부' },
  { name: '해외선교팀', description: '해외 선교 활동 계획 및 실행', parentName: '선교부' },
  { name: '사회봉사팀', description: '지역사회 봉사 활동', parentName: '선교부' },
  
  // 문화부 하위 부서들
  { name: '찬양팀', description: '예배 찬양 및 음악 사역', parentName: '문화부' },
  { name: '미디어팀', description: '방송 및 영상 제작', parentName: '문화부' },
  { name: '출판팀', description: '교회 소식지 및 출판물 제작', parentName: '문화부' },
  
  // 시설부 하위 부서들
  { name: '건물관리팀', description: '교회 건물 유지보수 및 관리', parentName: '시설부' },
  { name: '환경미화팀', description: '교회 청소 및 환경 관리', parentName: '시설부' },
  { name: '주차관리팀', description: '교회 주차장 관리 및 안내', parentName: '시설부' },
  
  // 재정부 하위 부서들
  { name: '회계팀', description: '교회 회계 및 장부 관리', parentName: '재정부' },
  { name: '헌금관리팀', description: '헌금 수납 및 관리', parentName: '재정부' },
  { name: '예산관리팀', description: '예산 계획 및 집행 관리', parentName: '재정부' },
]

async function main() {
  console.log('🌱 부서 시드 데이터 시작...')
  
  // 교회 찾기
  const church = await prisma.church.findFirst({
    where: { name: '에벤에셀교회' }
  })
  
  if (!church) {
    console.error('❌ 에벤에셀교회를 찾을 수 없습니다.')
    return
  }
  
  console.log(`🏛️  교회 ID: ${church.id} - ${church.name}`)
  
  // 관련된 데이터들 먼저 삭제 (외래키 제약조건 때문)
  await prisma.budget.deleteMany({
    where: { churchId: church.id }
  })
  console.log('🗑️  기존 예산 데이터 삭제 완료')
  
  // 부서 멤버 관계 정리
  await prisma.member.updateMany({
    where: { churchId: church.id },
    data: { departmentId: null }
  })
  console.log('🗑️  부서-멤버 관계 정리 완료')
  
  // 기존 부서 데이터 삭제
  await prisma.department.deleteMany({
    where: { churchId: church.id }
  })
  console.log('🗑️  기존 부서 데이터 삭제 완료')
  
  const createdDepartments: { [key: string]: string } = {}
  let createdCount = 0
  
  // 1단계: 최상위 부서들 먼저 생성
  console.log('📊 최상위 부서 생성 중...')
  const topLevelDepts = departments.filter(dept => !dept.parentName)
  
  for (const deptData of topLevelDepts) {
    try {
      const department = await prisma.department.create({
        data: {
          name: deptData.name,
          description: deptData.description,
          parentId: null,
          churchId: church.id,
          isActive: true
        }
      })
      createdDepartments[department.name] = department.id
      console.log(`  ✅ ${department.name} (${department.id})`)
      createdCount++
    } catch (error) {
      console.error(`  ❌ ${deptData.name} 생성 실패:`, error)
    }
  }
  
  // 2단계: 하위 부서들 생성
  console.log('📊 하위 부서 생성 중...')
  const subDepartments = departments.filter(dept => dept.parentName)
  
  for (const deptData of subDepartments) {
    try {
      const parentId = createdDepartments[deptData.parentName!]
      if (!parentId) {
        console.error(`  ❌ ${deptData.name}: 상위 부서 '${deptData.parentName}'을 찾을 수 없습니다`)
        continue
      }
      
      const department = await prisma.department.create({
        data: {
          name: deptData.name,
          description: deptData.description,
          parentId: parentId,
          churchId: church.id,
          isActive: true
        }
      })
      createdDepartments[department.name] = department.id
      console.log(`  ✅ ${department.name} (${department.id}) - 상위: ${deptData.parentName}`)
      createdCount++
    } catch (error) {
      console.error(`  ❌ ${deptData.name} 생성 실패:`, error)
    }
  }
  
  console.log(`\n🎉 총 ${createdCount}개 부서가 성공적으로 생성되었습니다!`)
  
  // 생성된 부서 구조 출력
  console.log('\n📋 생성된 부서 구조:')
  const allDepartments = await prisma.department.findMany({
    where: { churchId: church.id },
    include: {
      parent: {
        select: { name: true }
      },
      _count: {
        select: { children: true }
      }
    },
    orderBy: [
      { parentId: 'asc' },
      { name: 'asc' }
    ]
  })
  
  const topLevel = allDepartments.filter(d => !d.parentId)
  for (const dept of topLevel) {
    console.log(`├─ ${dept.name}`)
    const children = allDepartments.filter(d => d.parentId === dept.id)
    for (const child of children) {
      console.log(`   └─ ${child.name}`)
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ 시드 실행 중 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })