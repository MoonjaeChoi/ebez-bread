import { PrismaClient, Gender, MaritalStatus, MemberStatus, FamilyRelation } from '@prisma/client'

const prisma = new PrismaClient()

// 샘플 멤버 데이터 20개
const sampleMembers = [
  {
    name: '김철수',
    phone: '010-1234-5678',
    email: 'kim.chulsoo@gmail.com',
    birthDate: new Date('1980-03-15'),
    address: '서울특별시 서초구 방배동',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('2005-06-12'),
    confirmationDate: new Date('2006-06-12'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM001',
    relationship: FamilyRelation.HEAD,
    notes: '교회 창립 멤버 중 한 분'
  },
  {
    name: '이영희',
    phone: '010-2345-6789',
    email: 'lee.younghee@gmail.com',
    birthDate: new Date('1983-07-22'),
    address: '서울특별시 서초구 방배동',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('2005-08-14'),
    confirmationDate: new Date('2006-08-14'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM001',
    relationship: FamilyRelation.SPOUSE,
    notes: '찬양팀 리더'
  },
  {
    name: '김민준',
    phone: '010-3456-7890',
    email: 'kim.minjun@gmail.com',
    birthDate: new Date('2008-12-03'),
    address: '서울특별시 서초구 방배동',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.SINGLE,
    status: MemberStatus.ACTIVE,
    familyId: 'FAM001',
    relationship: FamilyRelation.CHILD,
    notes: '중등부 학생회장'
  },
  {
    name: '박성진',
    phone: '010-4567-8901',
    email: 'park.sungjin@gmail.com',
    birthDate: new Date('1975-05-18'),
    address: '서울특별시 강남구 역삼동',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('2000-04-09'),
    confirmationDate: new Date('2001-04-09'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM002',
    relationship: FamilyRelation.HEAD,
    notes: '장로님, 재정위원회 위원장'
  },
  {
    name: '최미영',
    phone: '010-5678-9012',
    email: 'choi.miyoung@gmail.com',
    birthDate: new Date('1978-09-25'),
    address: '서울특별시 강남구 역삼동',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('2002-09-15'),
    confirmationDate: new Date('2003-09-15'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM002',
    relationship: FamilyRelation.SPOUSE,
    notes: '여전도회 총무'
  },
  {
    name: '정수연',
    phone: '010-6789-0123',
    email: 'jung.suyeon@gmail.com',
    birthDate: new Date('1990-11-08'),
    address: '서울특별시 서초구 서초동',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.SINGLE,
    baptismDate: new Date('2015-07-26'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM003',
    relationship: FamilyRelation.HEAD,
    notes: '청년부 찬양팀'
  },
  {
    name: '장동욱',
    phone: '010-7890-1234',
    email: 'jang.dongwook@gmail.com',
    birthDate: new Date('1985-01-30'),
    address: '경기도 안양시 동안구',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('2010-05-16'),
    confirmationDate: new Date('2011-05-16'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM004',
    relationship: FamilyRelation.HEAD,
    notes: '교회학교 교사'
  },
  {
    name: '한소희',
    phone: '010-8901-2345',
    email: 'han.sohee@gmail.com',
    birthDate: new Date('1988-04-12'),
    address: '경기도 안양시 동안구',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('2012-03-11'),
    confirmationDate: new Date('2013-03-11'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM004',
    relationship: FamilyRelation.SPOUSE,
    notes: '유아부 담당 교사'
  },
  {
    name: '윤대호',
    phone: '010-9012-3456',
    email: 'yoon.daeho@gmail.com',
    birthDate: new Date('1965-08-07'),
    address: '서울특별시 관악구 봉천동',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('1990-12-25'),
    confirmationDate: new Date('1991-12-25'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM005',
    relationship: FamilyRelation.HEAD,
    notes: '집사님, 시설관리위원회 위원'
  },
  {
    name: '송은주',
    phone: '010-0123-4567',
    email: 'song.eunju@gmail.com',
    birthDate: new Date('1968-10-14'),
    address: '서울특별시 관악구 봉천동',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('1992-06-07'),
    confirmationDate: new Date('1993-06-07'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM005',
    relationship: FamilyRelation.SPOUSE,
    notes: '권사님, 어머니기도회 회장'
  },
  {
    name: '임재현',
    phone: '010-1357-2468',
    email: 'lim.jaehyun@gmail.com',
    birthDate: new Date('1992-02-28'),
    address: '서울특별시 영등포구 여의도동',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.SINGLE,
    baptismDate: new Date('2018-04-08'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM006',
    relationship: FamilyRelation.HEAD,
    notes: '청년부 회장'
  },
  {
    name: '강민정',
    phone: '010-2468-1357',
    email: 'kang.minjeong@gmail.com',
    birthDate: new Date('1995-06-17'),
    address: '서울특별시 마포구 합정동',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.SINGLE,
    baptismDate: new Date('2020-10-25'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM007',
    relationship: FamilyRelation.HEAD,
    notes: '새가족부 위원'
  },
  {
    name: '오세훈',
    phone: '010-3691-4702',
    email: 'oh.sehun@gmail.com',
    birthDate: new Date('1972-12-05'),
    address: '경기도 성남시 분당구',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('1998-11-15'),
    confirmationDate: new Date('1999-11-15'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM008',
    relationship: FamilyRelation.HEAD,
    notes: '안수집사, 전도위원회 부위원장'
  },
  {
    name: '배수진',
    phone: '010-4702-3691',
    email: 'bae.sujin@gmail.com',
    birthDate: new Date('1976-03-20'),
    address: '경기도 성남시 분당구',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('1999-07-18'),
    confirmationDate: new Date('2000-07-18'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM008',
    relationship: FamilyRelation.SPOUSE,
    notes: '권사, 선교위원회 총무'
  },
  {
    name: '홍길동',
    phone: '010-5814-7036',
    email: 'hong.gildong@gmail.com',
    birthDate: new Date('1987-09-13'),
    address: '서울특별시 송파구 잠실동',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.DIVORCED,
    baptismDate: new Date('2014-02-23'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM009',
    relationship: FamilyRelation.HEAD,
    notes: '미디어팀 총무'
  },
  {
    name: '문지혜',
    phone: '010-7036-5814',
    email: 'moon.jihye@gmail.com',
    birthDate: new Date('1993-04-26'),
    address: '서울특별시 강동구 천호동',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.SINGLE,
    baptismDate: new Date('2021-05-09'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM010',
    relationship: FamilyRelation.HEAD,
    notes: '교육위원회 위원, 주일학교 교사'
  },
  {
    name: '양준호',
    phone: '010-8147-9258',
    email: 'yang.junho@gmail.com',
    birthDate: new Date('1979-07-31'),
    address: '경기도 의왕시',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.WIDOWED,
    baptismDate: new Date('2003-01-19'),
    confirmationDate: new Date('2004-01-19'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM011',
    relationship: FamilyRelation.HEAD,
    notes: '집사, 봉사위원회 위원'
  },
  {
    name: '서현아',
    phone: '010-9258-8147',
    email: 'seo.hyuna@gmail.com',
    birthDate: new Date('1986-11-09'),
    address: '경기도 과천시',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('2013-08-04'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM012',
    relationship: FamilyRelation.HEAD,
    notes: '문화사역부 부장'
  },
  {
    name: '조민석',
    phone: '010-0369-1472',
    email: 'cho.minseok@gmail.com',
    birthDate: new Date('1991-01-16'),
    address: '서울특별시 동작구 사당동',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.SINGLE,
    baptismDate: new Date('2017-09-17'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM013',
    relationship: FamilyRelation.HEAD,
    notes: '찬양팀 기타리스트'
  },
  {
    name: '노수민',
    phone: '010-1472-0369',
    email: 'no.sumin@gmail.com',
    birthDate: new Date('1989-05-04'),
    address: '서울특별시 구로구 구로동',
    gender: Gender.FEMALE,
    maritalStatus: MaritalStatus.MARRIED,
    baptismDate: new Date('2016-12-24'),
    status: MemberStatus.ACTIVE,
    familyId: 'FAM014',
    relationship: FamilyRelation.HEAD,
    notes: '기도사역부 위원, 새벽기도회 리더'
  }
]

async function main() {
  console.log('🌱 샘플 멤버 데이터 시드 시작...')
  
  // 교회 찾기
  const church = await prisma.church.findFirst({
    where: { name: '과천교회' }
  })
  
  if (!church) {
    console.error('❌ 과천교회를 찾을 수 없습니다.')
    return
  }
  
  console.log(`🏛️  교회 ID: ${church.id} - ${church.name}`)
  
  // 기존 멤버 데이터 삭제 (선택사항)
  await prisma.member.deleteMany({
    where: { churchId: church.id }
  })
  console.log('🗑️  기존 멤버 데이터 삭제 완료')
  
  // 샘플 멤버 생성
  let createdCount = 0
  
  for (const memberData of sampleMembers) {
    try {
      const member = await prisma.member.create({
        data: {
          ...memberData,
          churchId: church.id
        }
      })
      console.log(`  ✅ ${member.name} (${member.id})`)
      createdCount++
    } catch (error) {
      console.error(`  ❌ ${memberData.name} 생성 실패:`, error)
    }
  }
  
  console.log(`\n🎉 총 ${createdCount}명의 샘플 멤버가 성공적으로 생성되었습니다!`)
}

main()
  .catch((e) => {
    console.error('❌ 시드 실행 중 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })