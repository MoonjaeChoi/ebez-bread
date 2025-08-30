import { PrismaClient } from '@prisma/client'
import { seedRealOrganizations } from './seeds/real-organization-seed'
import { seedOrganizationRoles } from './seeds/organization-role-seed'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting Supabase database seed...')

  // 1. 교회 생성 또는 가져오기
  let church = await prisma.church.findFirst({
    where: { name: '에벤에셀교회' }
  })

  if (!church) {
    church = await prisma.church.create({
      data: {
        name: '에벤에셀교회',
        address: '서울특별시 종로구 세종대로 175 (세종문화회관 맞은편)',
        phone: '02-1588-1234',
        email: 'info@ebenezer.org',
        pastorName: '김은혜',
        description: '하나님의 은혜로 세상을 변화시키는 교회\n\n주일예배: 오전 9시, 11시, 오후 2시\n수요예배: 오후 7시 30분\n새벽예배: 매일 오전 5시 30분\n\n설립년도: 1985년\n교인수: 약 3,500명',
      },
    })
    console.log('✅ Church created:', church.name)
  } else {
    console.log('✅ Church found:', church.name)
  }

  // 2. 다양한 역할의 사용자들 생성
  const users = [
    { 
      email: 'admin@gcchurch.kr', 
      name: '김은혜', 
      phone: '010-1234-5678', 
      role: 'SUPER_ADMIN' as const,
    },
    { 
      email: 'finance@ebenezer.org', 
      name: '이재정', 
      phone: '010-2345-6789', 
      role: 'FINANCIAL_MANAGER' as const,
    },
    { 
      email: 'pastor.lee@ebenezer.org', 
      name: '이목양', 
      phone: '010-3456-7890', 
      role: 'MINISTER' as const,
    },
    { 
      email: 'elder.park@ebenezer.org', 
      name: '박신실', 
      phone: '010-4567-8901', 
      role: 'COMMITTEE_CHAIR' as const,
    },
    { 
      email: 'deacon.kim@ebenezer.org', 
      name: '김봉사', 
      phone: '010-5678-9012', 
      role: 'DEPARTMENT_HEAD' as const,
    },
    { 
      email: 'account.jung@ebenezer.org', 
      name: '정회계', 
      phone: '010-6789-0123', 
      role: 'DEPARTMENT_ACCOUNTANT' as const,
    },
  ]

  const createdUsers = []
  for (const userData of users) {
    let user = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          churchId: church.id,
        },
      })
      createdUsers.push(user)
      console.log(`✅ User created: ${user.name} (${user.role})`)
    } else {
      createdUsers.push(user)
      console.log(`✅ User found: ${user.name} (${user.role})`)
    }
  }

  // 3. 직분 생성
  const positions = [
    { name: '담임목사', order: 1 },
    { name: '부목사', order: 2 },
    { name: '장로', order: 3 },
    { name: '권사', order: 4 },
    { name: '안수집사', order: 5 },
    { name: '서리집사', order: 6 },
    { name: '성도', order: 7 },
    { name: '전도사', order: 8 },
    { name: '목사', order: 9 },
  ]

  const createdPositions = []
  for (const position of positions) {
    let pos = await prisma.position.findFirst({
      where: { 
        name: position.name,
        churchId: church.id 
      }
    })

    if (!pos) {
      pos = await prisma.position.create({
        data: {
          name: position.name,
          order: position.order,
          churchId: church.id,
        },
      })
    }
    createdPositions.push(pos)
  }

  console.log('✅ Positions created/found:', createdPositions.length)

  // 4. 부서 생성
  const departments = [
    { name: '남선교회', description: '남성 성도들의 선교와 봉사 활동을 담당하는 부서' },
    { name: '여전도회', description: '여성 성도들의 전도와 교육 사역을 담당하는 부서' },
    { name: '청년부', description: '20-35세 청년들의 신앙 공동체 및 사역 부서' },
    { name: '장년부', description: '35세 이상 장년 성도들의 신앙 활동 부서' },
    { name: '주일학교', description: '유년부, 초등부, 중고등부 교육을 담당하는 부서' },
    { name: '찬양팀', description: '주일 및 각종 예배 찬양 사역을 담당하는 부서' },
    { name: '새가족부', description: '새로 등록한 가족들의 정착을 돕는 부서' },
    { name: '기도원', description: '교회 기도 사역과 중보기도를 담당하는 부서' },
    { name: '미디어팀', description: '예배 음향, 영상, 방송 사역을 담당하는 부서' },
    { name: '교육부', description: '각종 교육 프로그램과 성경공부를 담당하는 부서' },
  ]

  const createdDepartments = []
  for (const dept of departments) {
    let department = await prisma.department.findFirst({
      where: { 
        name: dept.name,
        churchId: church.id 
      }
    })

    if (!department) {
      department = await prisma.department.create({
        data: {
          name: dept.name,
          description: dept.description,
          churchId: church.id,
        },
      })
    }
    createdDepartments.push(department)
  }

  console.log('✅ Departments created/found:', createdDepartments.length)

  // 5. 풍부한 샘플 교인 데이터 생성
  const sampleMembers = [
    {
      name: '김철수',
      phone: '010-1234-1001',
      email: 'chulsoo.kim@gmail.com',
      birthDate: new Date('1975-03-15'),
      address: '서울특별시 종로구 청와대로 1',
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '안수집사')?.id || createdPositions[4].id,
      departmentId: createdDepartments.find(d => d.name === '남선교회')?.id || createdDepartments[0].id,
      registrationDate: new Date('2010-05-12'),
      baptismDate: new Date('2011-08-15'),
      confirmationDate: new Date('2012-04-08'),
      status: 'ACTIVE' as const,
    },
    {
      name: '이영희',
      phone: '010-1234-1002',
      email: 'younghee.lee@naver.com',
      birthDate: new Date('1982-07-22'),
      address: '서울특별시 중구 을지로 100',
      gender: 'FEMALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '권사')?.id || createdPositions[3].id,
      departmentId: createdDepartments.find(d => d.name === '여전도회')?.id || createdDepartments[1].id,
      registrationDate: new Date('2008-03-20'),
      baptismDate: new Date('2009-12-25'),
      confirmationDate: new Date('2010-06-13'),
      status: 'ACTIVE' as const,
    },
    {
      name: '박민수',
      phone: '010-1234-1003',
      email: 'minsu.park@kakao.com',
      birthDate: new Date('1995-12-10'),
      address: '서울특별시 강남구 테헤란로 152',
      gender: 'MALE' as const,
      maritalStatus: 'SINGLE' as const,
      positionId: createdPositions.find(p => p.name === '성도')?.id || createdPositions[6].id,
      departmentId: createdDepartments.find(d => d.name === '청년부')?.id || createdDepartments[2].id,
      registrationDate: new Date('2020-09-06'),
      baptismDate: new Date('2021-04-04'),
      status: 'ACTIVE' as const,
    },
    {
      name: '정소희',
      phone: '010-1234-1004',
      email: 'sohee.jung@daum.net',
      birthDate: new Date('1988-05-18'),
      address: '서울특별시 서초구 반포대로 58',
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      positionId: createdPositions.find(p => p.name === '서리집사')?.id || createdPositions[5].id,
      departmentId: createdDepartments.find(d => d.name === '찬양팀')?.id || createdDepartments[5].id,
      registrationDate: new Date('2015-02-14'),
      baptismDate: new Date('2016-05-08'),
      confirmationDate: new Date('2017-03-26'),
      status: 'ACTIVE' as const,
    },
    {
      name: '홍길동',
      phone: '010-1234-1005',
      email: 'gildong.hong@outlook.com',
      birthDate: new Date('1965-11-03'),
      address: '서울특별시 용산구 이태원로 200',
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '장로')?.id || createdPositions[2].id,
      departmentId: createdDepartments.find(d => d.name === '장년부')?.id || createdDepartments[3].id,
      registrationDate: new Date('1995-01-08'),
      baptismDate: new Date('1995-12-25'),
      confirmationDate: new Date('1996-04-21'),
      status: 'ACTIVE' as const,
    },
    {
      name: '최지은',
      phone: '010-1234-1006',
      email: 'jieun.choi@gmail.com',
      birthDate: new Date('1992-09-25'),
      address: '서울특별시 마포구 홍대입구역 9번출구',
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      positionId: createdPositions.find(p => p.name === '성도')?.id || createdPositions[6].id,
      departmentId: createdDepartments.find(d => d.name === '새가족부')?.id || createdDepartments[6].id,
      registrationDate: new Date('2023-11-12'),
      baptismDate: new Date('2024-04-07'),
      status: 'ACTIVE' as const,
    },
    {
      name: '강태호',
      phone: '010-1234-1007',
      email: 'taeho.kang@company.co.kr',
      birthDate: new Date('1978-01-14'),
      address: '경기도 성남시 분당구 정자동 178-1',
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '안수집사')?.id || createdPositions[4].id,
      departmentId: createdDepartments.find(d => d.name === '미디어팀')?.id || createdDepartments[8].id,
      registrationDate: new Date('2012-07-22'),
      baptismDate: new Date('2013-05-19'),
      confirmationDate: new Date('2014-02-16'),
      status: 'ACTIVE' as const,
    },
    {
      name: '윤미래',
      phone: '010-1234-1008',
      email: 'mirae.yoon@edu.go.kr',
      birthDate: new Date('1990-04-30'),
      address: '서울특별시 동대문구 회기로 76',
      gender: 'FEMALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '서리집사')?.id || createdPositions[5].id,
      departmentId: createdDepartments.find(d => d.name === '주일학교')?.id || createdDepartments[4].id,
      registrationDate: new Date('2018-06-03'),
      baptismDate: new Date('2019-08-11'),
      confirmationDate: new Date('2020-10-25'),
      status: 'ACTIVE' as const,
    },
  ]

  const createdMembers = []
  for (const memberData of sampleMembers) {
    let member = await prisma.member.findFirst({
      where: { 
        email: memberData.email,
        churchId: church.id 
      }
    })

    if (!member) {
      member = await prisma.member.create({
        data: {
          ...memberData,
          churchId: church.id,
        },
      })
    }
    createdMembers.push(member)
  }

  console.log('✅ Sample members created/found:', createdMembers.length)

  // 6. 풍부한 샘플 헌금 데이터 생성 (2024년 8월 ~ 현재)
  const months = ['2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08']
  
  const sampleOfferings = []
  
  // 각 교인별로 월별 헌금 기록 생성
  for (const member of createdMembers) {
    for (const month of months) {
      // 십일조 (매월)
      sampleOfferings.push({
        memberId: member.id,
        amount: Math.floor(Math.random() * 200000) + 50000, // 5만원~25만원
        offeringType: 'TITHE' as const,
        description: '십일조',
        offeringDate: new Date(`${month}-01`),
        churchId: church.id,
      })
      
      // 주일헌금 (월 4회 정도)
      for (let week = 0; week < 4; week++) {
        const sunday = new Date(`${month}-${String(1 + week * 7).padStart(2, '0')}`)
        if (sunday.getMonth() === new Date(`${month}-01`).getMonth()) {
          sampleOfferings.push({
            memberId: member.id,
            amount: Math.floor(Math.random() * 50000) + 10000, // 1만원~6만원
            offeringType: 'SUNDAY_OFFERING' as const,
            description: '주일헌금',
            offeringDate: sunday,
            churchId: church.id,
          })
        }
      }
      
      // 특별헌금 (가끔)
      if (Math.random() > 0.7) {
        const specialTypes = ['THANKSGIVING', 'SPECIAL', 'MISSION', 'BUILDING'] as const
        const specialType = specialTypes[Math.floor(Math.random() * specialTypes.length)]
        const descriptions = {
          THANKSGIVING: '감사헌금',
          SPECIAL: '특별헌금',
          MISSION: '선교헌금',
          BUILDING: '건축헌금'
        } as const
        
        sampleOfferings.push({
          memberId: member.id,
          amount: Math.floor(Math.random() * 100000) + 20000, // 2만원~12만원
          offeringType: specialType,
          description: descriptions[specialType],
          offeringDate: new Date(`${month}-15`),
          churchId: church.id,
        })
      }
    }
  }

  console.log(`📊 Generating ${sampleOfferings.length} offering records...`)
  
  // 배치로 헌금 데이터 생성 (중복 방지)
  const createdOfferings = []
  for (let i = 0; i < sampleOfferings.length; i += 50) { // 50개씩 배치 처리
    const batch = sampleOfferings.slice(i, i + 50)
    const batchResults = await Promise.all(
      batch.map(async (offering) => {
        // 중복 체크
        const existing = await prisma.offering.findFirst({
          where: {
            memberId: offering.memberId,
            offeringType: offering.offeringType as any,
            offeringDate: offering.offeringDate,
            churchId: offering.churchId,
          }
        })
        
        if (!existing) {
          return prisma.offering.create({
            data: offering,
          })
        }
        return existing
      })
    )
    createdOfferings.push(...batchResults)
    
    // 진행 상황 표시
    console.log(`  ✓ Processed ${Math.min(i + 50, sampleOfferings.length)}/${sampleOfferings.length} offerings`)
  }

  console.log('✅ Sample offerings created/found:', createdOfferings.length)

  // 7. 풍부한 샘플 출석 데이터 생성 (2024년 8월 ~ 현재)
  console.log('📊 Generating attendance records...')
  
  const attendanceData = []
  
  // 2024년 8월부터 현재까지의 주요 예배일 생성
  const startDate = new Date('2024-08-01')
  const endDate = new Date('2025-08-27')
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    let serviceType: 'SUNDAY_MORNING' | 'SUNDAY_EVENING' | 'WEDNESDAY' | 'FRIDAY' | null = null
    
    // 요일별 예배 타입 결정
    if (dayOfWeek === 0) { // 일요일
      serviceType = Math.random() > 0.3 ? 'SUNDAY_MORNING' : 'SUNDAY_EVENING'
    } else if (dayOfWeek === 3) { // 수요일
      serviceType = 'WEDNESDAY'
    } else if (dayOfWeek === 5) { // 금요일
      if (Math.random() > 0.7) serviceType = 'FRIDAY' // 금요기도회
    }
    
    if (serviceType) {
      for (const member of createdMembers) {
        // 교인별 출석률 차별화
        let attendanceRate = 0.8 // 기본 80%
        if (member.birthDate) {
          const memberAge = new Date().getFullYear() - member.birthDate.getFullYear()
          
          if (memberAge > 60) attendanceRate = 0.9 // 장년층 90%
          else if (memberAge < 30) attendanceRate = 0.7 // 청년층 70%
        }
        
        if (serviceType === 'SUNDAY_MORNING') attendanceRate += 0.1 // 주일 오전 출석률 높음
        
        attendanceData.push({
          memberId: member.id,
          serviceType: serviceType,
          attendanceDate: new Date(d),
          isPresent: Math.random() < attendanceRate,
          churchId: church.id,
        })
      }
    }
  }
  
  // 배치로 출석 데이터 생성 (중복 방지)
  const createdAttendances = []
  for (let i = 0; i < attendanceData.length; i += 100) { // 100개씩 배치 처리
    const batch = attendanceData.slice(i, i + 100)
    const batchResults = await Promise.all(
      batch.map(async (attendance) => {
        // 중복 체크
        const existing = await prisma.attendance.findFirst({
          where: {
            memberId: attendance.memberId,
            serviceType: attendance.serviceType as any,
            attendanceDate: attendance.attendanceDate,
            churchId: attendance.churchId,
          }
        })
        
        if (!existing) {
          return prisma.attendance.create({
            data: attendance,
          })
        }
        return existing
      })
    )
    createdAttendances.push(...batchResults)
    
    // 진행 상황 표시
    console.log(`  ✓ Processed ${Math.min(i + 100, attendanceData.length)}/${attendanceData.length} attendance records`)
  }

  console.log('✅ Sample attendances created/found:', createdAttendances.length)

  // 8. 샘플 심방 데이터 생성
  console.log('📊 Generating visitation records...')
  
  const visitationPurposes = ['GENERAL', 'NEW_FAMILY', 'HOSPITAL', 'BIRTHDAY', 'CONDOLENCE', 'COUNSELING', 'EVANGELISM', 'EVENT', 'OTHER'] as const
  const visitationData = []
  
  for (const member of createdMembers) {
    // 각 교인별로 1-3개의 심방 기록 생성
    const visitCount = Math.floor(Math.random() * 3) + 1
    
    for (let v = 0; v < visitCount; v++) {
      const visitDate = new Date(2024, 7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
      const purpose = visitationPurposes[Math.floor(Math.random() * visitationPurposes.length)]
      
      const purposes = {
        GENERAL: '일반 심방',
        NEW_FAMILY: '새가족 심방',
        HOSPITAL: '병문안',
        BIRTHDAY: '생일 축하',
        CONDOLENCE: '경조사',
        COUNSELING: '상담 및 기도',
        EVANGELISM: '전도 및 초청',
        EVENT: '교회 행사 안내',
        OTHER: '기타'
      } as const
      
      visitationData.push({
        memberId: member.id,
        purpose: purpose,
        description: `${purposes[purpose]} - ${member.name} 교인`,
        content: `${member.name} 교인 심방 내용입니다. 가정의 평안을 위해 기도드렸습니다.`,
        visitDate: visitDate,
        needsFollowUp: Math.random() > 0.7,
        followUpDate: Math.random() > 0.7 ? new Date(visitDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        churchId: church.id,
      })
    }
  }
  
  const createdVisitations = []
  for (const visitation of visitationData) {
    const existing = await prisma.visitation.findFirst({
      where: {
        memberId: visitation.memberId,
        visitDate: visitation.visitDate,
        purpose: visitation.purpose as any,
        churchId: visitation.churchId,
      }
    })
    
    if (!existing) {
      const created = await prisma.visitation.create({
        data: visitation,
      })
      createdVisitations.push(created)
    }
  }

  console.log('✅ Sample visitations created/found:', createdVisitations.length)

  // 9. 샘플 지출결의서 데이터 생성
  console.log('📊 Generating expense reports...')
  
  const expenseCategories = ['OFFICE', 'FACILITY', 'EDUCATION', 'MISSION', 'WELFARE', 'EVENT', 'OTHER'] as const
  const expenseData = []
  
  for (let i = 0; i < 20; i++) {
    const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
    const amount = Math.floor(Math.random() * 500000) + 50000 // 5만원~55만원
    const requestDate = new Date(2024, 7 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    
    const categories = {
      OFFICE: '사무용품',
      FACILITY: '시설관리',
      EDUCATION: '교육사역',
      MISSION: '선교사역',
      WELFARE: '복지사역',
      EVENT: '행사운영',
      OTHER: '기타'
    } as const
    
    const statuses = ['PENDING', 'APPROVED', 'REJECTED'] as const
    
    expenseData.push({
      title: `${categories[category]} 지출 신청`,
      description: `${categories[category]} 관련 지출 신청서입니다.`,
      amount: amount,
      category: category,
      requestDate: requestDate,
      status: statuses[Math.floor(Math.random() * 3)],
      requesterId: createdUsers[Math.floor(Math.random() * createdUsers.length)].id,
      churchId: church.id,
    })
  }
  
  const createdExpenseReports = []
  for (const expense of expenseData) {
    const created = await prisma.expenseReport.create({
      data: expense,
    })
    createdExpenseReports.push(created)
  }

  console.log('✅ Sample expense reports created:', createdExpenseReports.length)

  // 10. 계정 코드 데이터 생성 (전역 시스템 데이터)
  console.log('📊 Generating account codes...')
  
  const accountCodes = [
    // 수입 계정
    { code: '1000', name: '헌금수입', type: 'REVENUE' as const, parentId: null },
    { code: '1010', name: '십일조', type: 'REVENUE' as const, parentId: null },
    { code: '1020', name: '주일헌금', type: 'REVENUE' as const, parentId: null },
    { code: '1030', name: '감사헌금', type: 'REVENUE' as const, parentId: null },
    { code: '1040', name: '특별헌금', type: 'REVENUE' as const, parentId: null },
    { code: '1050', name: '선교헌금', type: 'REVENUE' as const, parentId: null },
    { code: '1060', name: '건축헌금', type: 'REVENUE' as const, parentId: null },
    { code: '1070', name: '기타헌금', type: 'REVENUE' as const, parentId: null },
    { code: '1100', name: '기타수입', type: 'REVENUE' as const, parentId: null },
    { code: '1110', name: '이자수입', type: 'REVENUE' as const, parentId: null },
    { code: '1120', name: '임대수입', type: 'REVENUE' as const, parentId: null },

    // 지출 계정
    { code: '2000', name: '사역비', type: 'EXPENSE' as const, parentId: null },
    { code: '2010', name: '목회비', type: 'EXPENSE' as const, parentId: null },
    { code: '2020', name: '교육비', type: 'EXPENSE' as const, parentId: null },
    { code: '2030', name: '선교비', type: 'EXPENSE' as const, parentId: null },
    { code: '2040', name: '복지비', type: 'EXPENSE' as const, parentId: null },
    { code: '2050', name: '전도비', type: 'EXPENSE' as const, parentId: null },
    
    { code: '3000', name: '운영비', type: 'EXPENSE' as const, parentId: null },
    { code: '3010', name: '급여', type: 'EXPENSE' as const, parentId: null },
    { code: '3020', name: '사무용품비', type: 'EXPENSE' as const, parentId: null },
    { code: '3030', name: '통신비', type: 'EXPENSE' as const, parentId: null },
    { code: '3040', name: '교통비', type: 'EXPENSE' as const, parentId: null },
    { code: '3050', name: '식비', type: 'EXPENSE' as const, parentId: null },
    
    { code: '4000', name: '시설비', type: 'EXPENSE' as const, parentId: null },
    { code: '4010', name: '건물관리비', type: 'EXPENSE' as const, parentId: null },
    { code: '4020', name: '수도광열비', type: 'EXPENSE' as const, parentId: null },
    { code: '4030', name: '수리비', type: 'EXPENSE' as const, parentId: null },
    { code: '4040', name: '청소비', type: 'EXPENSE' as const, parentId: null },
    { code: '4050', name: '보안비', type: 'EXPENSE' as const, parentId: null },
  ]

  const createdAccountCodes = []
  for (const accountCode of accountCodes) {
    let existingCode = await prisma.accountCode.findFirst({
      where: { 
        code: accountCode.code
      }
    })

    if (!existingCode) {
      existingCode = await prisma.accountCode.create({
        data: {
          ...accountCode,
          level: 1, // 기본적으로 1레벨
          order: parseInt(accountCode.code.padEnd(6, '0')),
          allowTransaction: true,
          isActive: true,
          isSystem: true,
          churchId: null // 시스템 계정
        }
      })
    }
    createdAccountCodes.push(existingCode)
  }

  console.log('✅ Account codes created/found:', createdAccountCodes.length)

  // 11. 추가 교인 데이터 생성 (더 다양한 프로필)
  console.log('📊 Generating additional members...')
  
  const additionalMembers = [
    {
      name: '서진우',
      phone: '010-1234-2001',
      email: 'jinwoo.seo@tech.co.kr',
      birthDate: new Date('1985-08-12'),
      address: '서울특별시 강남구 역삼동 123-45',
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '안수집사')?.id || createdPositions[4].id,
      departmentId: createdDepartments.find(d => d.name === '미디어팀')?.id || createdDepartments[8].id,
      registrationDate: new Date('2019-03-10'),
      baptismDate: new Date('2019-12-25'),
      confirmationDate: new Date('2020-05-31'),
      status: 'ACTIVE' as const,
    },
    {
      name: '한미영',
      phone: '010-1234-2002',
      email: 'miyoung.han@school.ac.kr',
      birthDate: new Date('1970-12-05'),
      address: '서울특별시 송파구 잠실동 567-89',
      gender: 'FEMALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '권사')?.id || createdPositions[3].id,
      departmentId: createdDepartments.find(d => d.name === '교육부')?.id || createdDepartments[9].id,
      registrationDate: new Date('2005-09-18'),
      baptismDate: new Date('2006-04-16'),
      confirmationDate: new Date('2007-02-25'),
      status: 'ACTIVE' as const,
    },
    {
      name: '조현석',
      phone: '010-1234-2003',
      email: 'hyunseok.cho@finance.com',
      birthDate: new Date('1980-06-28'),
      address: '경기도 고양시 일산동구 백석동 101-202',
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '장로')?.id || createdPositions[2].id,
      departmentId: createdDepartments.find(d => d.name === '남선교회')?.id || createdDepartments[0].id,
      registrationDate: new Date('2002-11-24'),
      baptismDate: new Date('2003-08-17'),
      confirmationDate: new Date('2004-03-21'),
      status: 'ACTIVE' as const,
    },
    {
      name: '임수진',
      phone: '010-1234-2004',
      email: 'sujin.lim@hospital.org',
      birthDate: new Date('1987-04-15'),
      address: '서울특별시 서초구 서초동 303-404',
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      positionId: createdPositions.find(p => p.name === '서리집사')?.id || createdPositions[5].id,
      departmentId: createdDepartments.find(d => d.name === '기도원')?.id || createdDepartments[7].id,
      registrationDate: new Date('2016-07-09'),
      baptismDate: new Date('2017-01-29'),
      confirmationDate: new Date('2018-06-10'),
      status: 'ACTIVE' as const,
    },
    {
      name: '양태식',
      phone: '010-1234-2005',
      email: 'taesik.yang@construction.kr',
      birthDate: new Date('1968-02-20'),
      address: '인천광역시 연수구 송도동 505-606',
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '안수집사')?.id || createdPositions[4].id,
      departmentId: createdDepartments.find(d => d.name === '장년부')?.id || createdDepartments[3].id,
      registrationDate: new Date('1998-05-17'),
      baptismDate: new Date('1999-02-14'),
      confirmationDate: new Date('1999-10-31'),
      status: 'ACTIVE' as const,
    },
    {
      name: '노은실',
      phone: '010-1234-2006',
      email: 'eunsil.noh@welfare.go.kr',
      birthDate: new Date('1993-11-08'),
      address: '서울특별시 영등포구 여의도동 707-808',
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      positionId: createdPositions.find(p => p.name === '성도')?.id || createdPositions[6].id,
      departmentId: createdDepartments.find(d => d.name === '청년부')?.id || createdDepartments[2].id,
      registrationDate: new Date('2022-01-16'),
      baptismDate: new Date('2022-08-28'),
      status: 'ACTIVE' as const,
    },
    {
      name: '문지혜',
      phone: '010-1234-2007',
      email: 'jihye.moon@design.studio',
      birthDate: new Date('1991-09-03'),
      address: '서울특별시 홍대입구 와우산로 123',
      gender: 'FEMALE' as const,
      maritalStatus: 'SINGLE' as const,
      positionId: createdPositions.find(p => p.name === '성도')?.id || createdPositions[6].id,
      departmentId: createdDepartments.find(d => d.name === '찬양팀')?.id || createdDepartments[5].id,
      registrationDate: new Date('2023-06-11'),
      baptismDate: new Date('2024-02-18'),
      status: 'ACTIVE' as const,
    },
    {
      name: '오성민',
      phone: '010-1234-2008',
      email: 'seongmin.oh@law.office',
      birthDate: new Date('1972-01-30'),
      address: '서울특별시 서대문구 연희동 909-101',
      gender: 'MALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '안수집사')?.id || createdPositions[4].id,
      departmentId: createdDepartments.find(d => d.name === '남선교회')?.id || createdDepartments[0].id,
      registrationDate: new Date('2007-10-07'),
      baptismDate: new Date('2008-07-13'),
      confirmationDate: new Date('2009-04-26'),
      status: 'ACTIVE' as const,
    },
    {
      name: '백소연',
      phone: '010-1234-2009',
      email: 'soyeon.baek@pharmacy.com',
      birthDate: new Date('1984-07-19'),
      address: '경기도 성남시 수정구 태평동 111-222',
      gender: 'FEMALE' as const,
      maritalStatus: 'MARRIED' as const,
      positionId: createdPositions.find(p => p.name === '서리집사')?.id || createdPositions[5].id,
      departmentId: createdDepartments.find(d => d.name === '여전도회')?.id || createdDepartments[1].id,
      registrationDate: new Date('2014-12-21'),
      baptismDate: new Date('2015-07-26'),
      confirmationDate: new Date('2016-11-20'),
      status: 'ACTIVE' as const,
    },
    {
      name: '유동현',
      phone: '010-1234-2010',
      email: 'donghyun.yoo@startup.io',
      birthDate: new Date('1994-05-25'),
      address: '서울특별시 강남구 삼성동 333-444',
      gender: 'MALE' as const,
      maritalStatus: 'SINGLE' as const,
      positionId: createdPositions.find(p => p.name === '성도')?.id || createdPositions[6].id,
      departmentId: createdDepartments.find(d => d.name === '청년부')?.id || createdDepartments[2].id,
      registrationDate: new Date('2021-08-29'),
      baptismDate: new Date('2022-03-27'),
      status: 'ACTIVE' as const,
    },
  ]

  const moreCreatedMembers = []
  for (const memberData of additionalMembers) {
    let member = await prisma.member.findFirst({
      where: { 
        email: memberData.email,
        churchId: church.id 
      }
    })

    if (!member) {
      member = await prisma.member.create({
        data: {
          ...memberData,
          churchId: church.id,
        },
      })
    }
    moreCreatedMembers.push(member)
  }

  console.log('✅ Additional members created/found:', moreCreatedMembers.length)

  // 12. 새로운 교인들을 위한 헌금 데이터 생성
  console.log('📊 Generating offerings for new members...')
  
  const allMembers = [...createdMembers, ...moreCreatedMembers]
  const newMemberOfferings = []
  
  // 새로 추가된 교인들에 대해서만 헌금 데이터 생성
  for (const member of moreCreatedMembers) {
    for (const month of months.slice(-6)) { // 최근 6개월만
      // 십일조
      newMemberOfferings.push({
        memberId: member.id,
        amount: Math.floor(Math.random() * 300000) + 100000, // 10만원~40만원
        offeringType: 'TITHE' as const,
        description: '십일조',
        offeringDate: new Date(`${month}-01`),
        churchId: church.id,
      })
      
      // 주일헌금 (월 4회)
      for (let week = 0; week < 4; week++) {
        const sunday = new Date(`${month}-${String(1 + week * 7).padStart(2, '0')}`)
        if (sunday.getMonth() === new Date(`${month}-01`).getMonth()) {
          newMemberOfferings.push({
            memberId: member.id,
            amount: Math.floor(Math.random() * 100000) + 20000, // 2만원~12만원
            offeringType: 'SUNDAY_OFFERING' as const,
            description: '주일헌금',
            offeringDate: sunday,
            churchId: church.id,
          })
        }
      }
    }
  }

  // 새 교인 헌금 데이터 일괄 생성
  const newOfferingsCreated = []
  for (const offering of newMemberOfferings) {
    const existing = await prisma.offering.findFirst({
      where: {
        memberId: offering.memberId,
        offeringType: offering.offeringType as any,
        offeringDate: offering.offeringDate,
        churchId: offering.churchId,
      }
    })
    
    if (!existing) {
      const created = await prisma.offering.create({
        data: offering,
      })
      newOfferingsCreated.push(created)
    }
  }

  console.log('✅ New member offerings created:', newOfferingsCreated.length)

  // 13. 더 많은 심방 데이터 생성
  console.log('📊 Generating additional visitation records...')
  
  const additionalVisitations = []
  
  for (const member of allMembers) {
    // 2025년 데이터 추가
    if (Math.random() > 0.4) { // 60% 확률로 2025년 심방 기록
      const visitDate = new Date(2025, Math.floor(Math.random() * 8), Math.floor(Math.random() * 28) + 1)
      const purpose = visitationPurposes[Math.floor(Math.random() * visitationPurposes.length)]
      
      const purposes = {
        GENERAL: '일반 심방',
        NEW_FAMILY: '새가족 심방',
        HOSPITAL: '병문안',
        BIRTHDAY: '생일 축하',
        CONDOLENCE: '경조사',
        COUNSELING: '상담 및 기도',
        EVANGELISM: '전도 및 초청',
        EVENT: '교회 행사 안내',
        OTHER: '기타'
      } as const
      
      additionalVisitations.push({
        memberId: member.id,
        purpose: purpose,
        description: `${purposes[purpose]} - ${member.name} 교인 (2025년)`,
        content: `2025년 ${member.name} 교인 심방입니다. 새해 목표와 신앙 계획에 대해 나누고 기도했습니다.`,
        visitDate: visitDate,
        needsFollowUp: Math.random() > 0.6,
        followUpDate: Math.random() > 0.6 ? new Date(visitDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
        churchId: church.id,
      })
    }
  }
  
  const moreVisitationsCreated = []
  for (const visitation of additionalVisitations) {
    const existing = await prisma.visitation.findFirst({
      where: {
        memberId: visitation.memberId,
        visitDate: visitation.visitDate,
        purpose: visitation.purpose as any,
        churchId: visitation.churchId,
      }
    })
    
    if (!existing) {
      const created = await prisma.visitation.create({
        data: visitation,
      })
      moreVisitationsCreated.push(created)
    }
  }

  console.log('✅ Additional visitations created:', moreVisitationsCreated.length)

  // 14. 2025년 추가 지출결의서 데이터
  console.log('📊 Generating 2025 expense reports...')
  
  const additionalExpenseData = []
  
  for (let i = 0; i < 15; i++) {
    const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
    const amount = Math.floor(Math.random() * 1000000) + 100000 // 10만원~110만원
    const requestDate = new Date(2025, Math.floor(Math.random() * 8), Math.floor(Math.random() * 28) + 1)
    
    const categories = {
      OFFICE: '사무용품',
      FACILITY: '시설관리',
      EDUCATION: '교육사역',
      MISSION: '선교사역',
      WELFARE: '복지사역',
      EVENT: '행사운영',
      OTHER: '기타'
    } as const
    
    const statuses = ['PENDING', 'APPROVED', 'REJECTED'] as const
    const status = statuses[Math.floor(Math.random() * 3)]
    
    const expenseItem: any = {
      title: `2025년 ${categories[category]} 지출 신청`,
      description: `2025년 ${categories[category]} 관련 지출 신청서입니다.`,
      amount: amount,
      category: category,
      requestDate: requestDate,
      status: status as any,
      requesterId: createdUsers[Math.floor(Math.random() * createdUsers.length)].id,
      churchId: church.id,
    }
    
    // 승인/거부 날짜 추가
    if (status === 'APPROVED') {
      expenseItem.approvedDate = new Date(requestDate.getTime() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000)
    } else if (status === 'REJECTED') {
      expenseItem.rejectedDate = new Date(requestDate.getTime() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000)
      expenseItem.rejectionReason = '예산 부족으로 인한 보류'
    }
    
    additionalExpenseData.push(expenseItem)
  }
  
  const moreExpenseReportsCreated = []
  for (const expense of additionalExpenseData) {
    const created = await prisma.expenseReport.create({
      data: expense,
    })
    moreExpenseReportsCreated.push(created)
  }

  console.log('✅ Additional expense reports created:', moreExpenseReportsCreated.length)

  console.log('🎉 Enhanced Supabase database seed completed!')
  console.log(`📊 Final Summary:`)
  console.log(`   - Church: ${church.name}`)
  console.log(`   - Users: ${createdUsers.length}`)
  console.log(`   - Positions: ${createdPositions.length}`)
  console.log(`   - Departments: ${createdDepartments.length}`)
  console.log(`   - Members: ${createdMembers.length + moreCreatedMembers.length} (${moreCreatedMembers.length} new)`)
  console.log(`   - Offerings: ${createdOfferings.length + newOfferingsCreated.length} (${newOfferingsCreated.length} new)`)
  console.log(`   - Attendances: ${createdAttendances.length}`)
  console.log(`   - Visitations: ${createdVisitations.length + moreVisitationsCreated.length} (${moreVisitationsCreated.length} new)`)
  console.log(`   - Expense Reports: ${createdExpenseReports.length + moreExpenseReportsCreated.length} (${moreExpenseReportsCreated.length} new)`)
  console.log(`   - Account Codes: ${createdAccountCodes.length} (new)`)

  // 실제 조직구조 시딩 (기존 예시 조직 대신 실제 조직구조 사용)
  await seedRealOrganizations(church.id)

  // 조직 직책 시딩
  await seedOrganizationRoles(church.id)

  console.log('🎉 All seeding completed successfully!')
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