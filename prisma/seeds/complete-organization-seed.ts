import { PrismaClient, OrganizationLevel } from '@prisma/client'

const prisma = new PrismaClient()

interface OrganizationData {
  code: string
  name: string
  englishName?: string
  level: OrganizationLevel
  parentCode?: string
  description?: string
  sortOrder?: number
}

const organizations: OrganizationData[] = [
  // LEVEL_1: 위원회/교구 (Committee/District) - 최상위 조직 단위
  
  // 교구 조직 (District Organization)
  { code: 'DC', name: '교구', englishName: 'District Committee', level: 'LEVEL_1', description: '지역별 교구 조직으로 목장 및 구역 관리를 담당', sortOrder: 1 },
  
  // 행정사역부 
  { code: 'AD', name: '행정사역부', englishName: 'Administration Ministry', level: 'LEVEL_1', description: '교회 운영과 행정 업무 총괄', sortOrder: 2 },
  
  // 청년부
  { code: 'YO', name: '청년부', englishName: 'Youth Committee', level: 'LEVEL_1', description: '청년 사역 전담 위원회', sortOrder: 3 },
  
  // 찬양사역위원회
  { code: 'PR', name: '찬양사역위원회', englishName: 'Praise Ministry Committee', level: 'LEVEL_1', description: '교회 전체 찬양 사역 담당', sortOrder: 4 },
  
  // 예배찬양위원회
  { code: 'WO', name: '예배찬양위원회', englishName: 'Worship & Praise Committee', level: 'LEVEL_1', description: '예배와 찬양 전반 관리', sortOrder: 5 },
  
  // 선교위원회들
  { code: 'WM', name: '세계선교위원회', englishName: 'World Mission Committee', level: 'LEVEL_1', description: '해외선교 담당', sortOrder: 6 },
  { code: 'NK', name: '북한선교위원회', englishName: 'North Korea Mission Committee', level: 'LEVEL_1', description: '북한선교 담당', sortOrder: 7 },
  { code: 'DM', name: '국내선교위원회', englishName: 'Domestic Mission Committee', level: 'LEVEL_1', description: '국내선교 담당', sortOrder: 8 },
  { code: 'EM', name: '환경선교위원회', englishName: 'Environmental Mission Committee', level: 'LEVEL_1', description: '환경선교 담당', sortOrder: 9 },
  
  // 전도위원회
  { code: 'EV', name: '전도위원회', englishName: 'Evangelism Committee', level: 'LEVEL_1', description: '전도사역 담당', sortOrder: 10 },
  
  // 봉사위원회
  { code: 'SE', name: '봉사위원회', englishName: 'Service Committee', level: 'LEVEL_1', description: '봉사활동 담당', sortOrder: 11 },
  
  // 교육위원회들
  { code: 'AE', name: '장년교육위원회', englishName: 'Adult Education Committee', level: 'LEVEL_1', description: '성인교육 담당', sortOrder: 12 },
  { code: 'NE', name: '다음세대교육위원회', englishName: 'Next Generation Education Committee', level: 'LEVEL_1', description: '아동청소년교육 담당', sortOrder: 13 },
  
  // 기타 위원회들
  { code: 'CU', name: '문화사역위원회', englishName: 'Cultural Ministry Committee', level: 'LEVEL_1', description: '문화사역 담당', sortOrder: 14 },
  { code: 'DI', name: '장애인사역위원회', englishName: 'Disability Ministry Committee', level: 'LEVEL_1', description: '장애인사역 담당', sortOrder: 15 },
  { code: 'MA', name: '관리위원회', englishName: 'Management Committee', level: 'LEVEL_1', description: '시설관리 담당', sortOrder: 16 },
  { code: 'ME', name: '미디어사역위원회', englishName: 'Media Ministry Committee', level: 'LEVEL_1', description: '미디어사역 담당', sortOrder: 17 },
  { code: 'EX', name: '대외협력위원회', englishName: 'External Relations Committee', level: 'LEVEL_1', description: '대외협력 담당', sortOrder: 18 },
  { code: 'FI', name: '재정위원회', englishName: 'Finance Committee', level: 'LEVEL_1', description: '재정관리 담당', sortOrder: 19 },
  { code: 'AU', name: '감사위원회', englishName: 'Audit Committee', level: 'LEVEL_1', description: '감사업무 담당', sortOrder: 20 },
  { code: 'VE', name: '차량관리위원회', englishName: 'Vehicle Management Committee', level: 'LEVEL_1', description: '차량관리 담당', sortOrder: 21 },
  { code: 'NF', name: '새가족위원회', englishName: 'Newcomers Committee', level: 'LEVEL_1', description: '새가족사역 담당', sortOrder: 22 },
  { code: 'SC', name: '하늘행복장학회', englishName: 'Heaven Happiness Scholarship Committee', level: 'LEVEL_1', description: '장학사업 담당', sortOrder: 23 },
  { code: 'CC', name: '시냇가 상담센터', englishName: 'Sinaetga Counseling Center Committee', level: 'LEVEL_1', description: '상담사역 담당', sortOrder: 24 },
  { code: 'YC', name: '시냇가 청소년센터', englishName: 'Sinaetga Youth Center Committee', level: 'LEVEL_1', description: '청소년사역 담당', sortOrder: 25 },

  // LEVEL_2: 교구별 세부 조직 및 각 위원회별 부서
  
  // 교구별 조직 (24개 교구)
  { code: 'DC-01', name: '1교구', englishName: '1st District - 1단지', level: 'LEVEL_2', parentCode: 'DC', description: '1단지 지역 담당 교구', sortOrder: 1 },
  { code: 'DC-02', name: '2교구', englishName: '2nd District - 2단지', level: 'LEVEL_2', parentCode: 'DC', description: '2단지 지역 담당 교구', sortOrder: 2 },
  { code: 'DC-03', name: '3교구', englishName: '3rd District - 3단지', level: 'LEVEL_2', parentCode: 'DC', description: '3단지 지역 담당 교구', sortOrder: 3 },
  { code: 'DC-04', name: '갈현교구', englishName: 'Galhyeon District - 갈현동', level: 'LEVEL_2', parentCode: 'DC', description: '갈현동 지역 담당 교구', sortOrder: 4 },
  { code: 'DC-05', name: '4·5교구', englishName: '4th·5th District - 4·5단지', level: 'LEVEL_2', parentCode: 'DC', description: '4·5단지 지역 담당 교구', sortOrder: 5 },
  { code: 'DC-06', name: '6교구', englishName: '6th District - 6단지', level: 'LEVEL_2', parentCode: 'DC', description: '6단지 지역 담당 교구', sortOrder: 6 },
  { code: 'DC-07', name: '7·9교구', englishName: '7th·9th District - 7·9단지', level: 'LEVEL_2', parentCode: 'DC', description: '7·9단지 지역 담당 교구', sortOrder: 7 },
  { code: 'DC-08', name: '8교구', englishName: '8th District - 8단지', level: 'LEVEL_2', parentCode: 'DC', description: '8단지 지역 담당 교구', sortOrder: 8 },
  { code: 'DC-09', name: '부림교구', englishName: 'Burim District - 부림동', level: 'LEVEL_2', parentCode: 'DC', description: '부림동 지역 담당 교구', sortOrder: 9 },
  { code: 'DC-10', name: '10교구', englishName: '10th District - 10단지', level: 'LEVEL_2', parentCode: 'DC', description: '10단지 지역 담당 교구', sortOrder: 10 },
  { code: 'DC-11', name: '11교구', englishName: '11th District - 11단지', level: 'LEVEL_2', parentCode: 'DC', description: '11단지 지역 담당 교구', sortOrder: 11 },
  { code: 'DC-12', name: '문원교구', englishName: 'Munwon District - 문원동', level: 'LEVEL_2', parentCode: 'DC', description: '문원동 지역 담당 교구', sortOrder: 12 },
  { code: 'DC-13', name: '별양교구', englishName: 'Byeolyang District - 별양동', level: 'LEVEL_2', parentCode: 'DC', description: '별양동 지역 담당 교구', sortOrder: 13 },
  { code: 'DC-14', name: '서울교구', englishName: 'Seoul District - 서울', level: 'LEVEL_2', parentCode: 'DC', description: '서울 지역 담당 교구', sortOrder: 14 },
  { code: 'DC-15', name: '수산교구', englishName: 'Susan District - 수원·산본·안산', level: 'LEVEL_2', parentCode: 'DC', description: '수원·산본·안산 지역 담당', sortOrder: 15 },
  { code: 'DC-16', name: '분수교구', englishName: 'Bunsu District - 분당·수지', level: 'LEVEL_2', parentCode: 'DC', description: '분당·수지 지역 담당', sortOrder: 16 },
  { code: 'DC-17', name: '안양교구', englishName: 'Anyang District - 안양', level: 'LEVEL_2', parentCode: 'DC', description: '안양 지역 담당 교구', sortOrder: 17 },
  { code: 'DC-18', name: '우면·관문교구', englishName: 'Umyeon·Gwanmun District', level: 'LEVEL_2', parentCode: 'DC', description: '우면·과천·관문·주암 지역', sortOrder: 18 },
  { code: 'DC-19', name: '의왕교구', englishName: 'Uiwang District - 의왕', level: 'LEVEL_2', parentCode: 'DC', description: '의왕 지역 담당 교구', sortOrder: 19 },
  { code: 'DC-20', name: '중앙교구', englishName: 'Central District - 중앙동', level: 'LEVEL_2', parentCode: 'DC', description: '중앙동 지역 담당 교구', sortOrder: 20 },
  { code: 'DC-21', name: '평촌교구', englishName: 'Pyeongchon District - 평촌', level: 'LEVEL_2', parentCode: 'DC', description: '평촌 지역 담당 교구', sortOrder: 21 },
  { code: 'DC-22', name: '은빛교구', englishName: 'Silver District', level: 'LEVEL_2', parentCode: 'DC', description: '은퇴자 및 시니어 대상 교구', sortOrder: 22 },
  { code: 'DC-23', name: '30+교구', englishName: '30+ District', level: 'LEVEL_2', parentCode: 'DC', description: '30대 이상 청년 교구', sortOrder: 23 },
  { code: 'DC-24', name: '청년교구', englishName: 'Youth District', level: 'LEVEL_2', parentCode: 'DC', description: '청년층 전담 교구', sortOrder: 24 },

  // 행정사역부 하위 조직
  { code: 'AD-AM', name: '행정관리부', englishName: 'Administration Management Department', level: 'LEVEL_2', parentCode: 'AD', description: '교회 전반 행정 업무 관리', sortOrder: 1 },

  // 청년부 하위 조직
  { code: 'YO-Y1', name: '1청년부', englishName: '1st Youth Department', level: 'LEVEL_2', parentCode: 'YO', description: '1청년부 (20대 초반 대상)', sortOrder: 1 },
  { code: 'YO-Y2', name: '2청년부', englishName: '2nd Youth Department', level: 'LEVEL_2', parentCode: 'YO', description: '2청년부 (20대 후반~30대 초반 대상)', sortOrder: 2 },

  // 찬양사역위원회 하위 조직
  { code: 'PR-GI', name: '기드온찬양대', englishName: 'Gideon Choir Department', level: 'LEVEL_2', parentCode: 'PR', description: '기드온찬양대 운영', sortOrder: 1 },
  { code: 'PR-HI', name: '히스피플찬양단', englishName: 'His People Praise Team Department', level: 'LEVEL_2', parentCode: 'PR', description: '히스피플찬양단 운영', sortOrder: 2 },

  // 예배찬양위원회 하위 조직
  { code: 'WO-WO', name: '예배부', englishName: 'Worship Department', level: 'LEVEL_2', parentCode: 'WO', description: '예배 준비 및 진행 총괄', sortOrder: 1 },
  { code: 'WO-SA', name: '성례부', englishName: 'Sacrament Department', level: 'LEVEL_2', parentCode: 'WO', description: '성례전 준비 및 관리', sortOrder: 2 },
  { code: 'WO-PR', name: '기도사역부', englishName: 'Prayer Ministry Department', level: 'LEVEL_2', parentCode: 'WO', description: '기도 사역 전담', sortOrder: 3 },
  { code: 'WO-MO', name: '어머니기도회부', englishName: 'Mothers\' Prayer Department', level: 'LEVEL_2', parentCode: 'WO', description: '어머니기도회 담당', sortOrder: 4 },
  { code: 'WO-C1', name: '찬양1부', englishName: '1st Praise Department', level: 'LEVEL_2', parentCode: 'WO', description: '1부 예배 찬양 담당', sortOrder: 5 },
  { code: 'WO-C2', name: '찬양2부', englishName: '2nd Praise Department', level: 'LEVEL_2', parentCode: 'WO', description: '2부 예배 찬양 담당', sortOrder: 6 },

  // 선교위원회들 하위 조직
  { code: 'WM-WM', name: '세계선교부', englishName: 'World Mission Department', level: 'LEVEL_2', parentCode: 'WM', description: '세계선교 담당', sortOrder: 1 },
  { code: 'WM-TR', name: '선교훈련부', englishName: 'Mission Training Department', level: 'LEVEL_2', parentCode: 'WM', description: '선교훈련 담당', sortOrder: 2 },
  { code: 'WM-CO', name: '선교협력부', englishName: 'Mission Cooperation Department', level: 'LEVEL_2', parentCode: 'WM', description: '선교협력 담당', sortOrder: 3 },

  { code: 'NK-NK', name: '북한선교부', englishName: 'North Korea Mission Department', level: 'LEVEL_2', parentCode: 'NK', description: '북한선교 담당', sortOrder: 1 },
  { code: 'NK-DE', name: '탈북민선교부', englishName: 'Defector Mission Department', level: 'LEVEL_2', parentCode: 'NK', description: '탈북민선교 담당', sortOrder: 2 },
  { code: 'NK-UN', name: '통일선교부', englishName: 'Unification Mission Department', level: 'LEVEL_2', parentCode: 'NK', description: '통일선교 담당', sortOrder: 3 },

  { code: 'DM-DM', name: '국내선교부', englishName: 'Domestic Mission Department', level: 'LEVEL_2', parentCode: 'DM', description: '국내선교 담당', sortOrder: 1 },
  { code: 'DM-MI', name: '군선교부', englishName: 'Military Mission Department', level: 'LEVEL_2', parentCode: 'DM', description: '군선교 담당', sortOrder: 2 },
  { code: 'DM-PO', name: '경찰교정선교부', englishName: 'Police & Correctional Mission Department', level: 'LEVEL_2', parentCode: 'DM', description: '경찰교정선교 담당', sortOrder: 3 },
  { code: 'DM-HO', name: '병원선교부', englishName: 'Hospital Mission Department', level: 'LEVEL_2', parentCode: 'DM', description: '병원선교 담당', sortOrder: 4 },
  { code: 'DM-YE', name: '예사랑선교부', englishName: 'Jesus Love Mission Department', level: 'LEVEL_2', parentCode: 'DM', description: '예사랑선교 담당', sortOrder: 5 },

  { code: 'EM-EM', name: '환경선교부', englishName: 'Environmental Mission Department', level: 'LEVEL_2', parentCode: 'EM', description: '환경선교 담당', sortOrder: 1 },
  { code: 'EM-TR', name: '생태영성훈련부', englishName: 'Ecological Spirituality Training Department', level: 'LEVEL_2', parentCode: 'EM', description: '생태영성훈련 담당', sortOrder: 2 },

  // 전도위원회 하위 조직
  { code: 'EV-HE', name: '하늘행복전도대', englishName: 'Heaven Happiness Evangelism Team Department', level: 'LEVEL_2', parentCode: 'EV', description: '하늘행복전도대 운영', sortOrder: 1 },

  // 봉사위원회 하위 조직
  { code: 'SE-SE', name: '봉사부', englishName: 'Service Department', level: 'LEVEL_2', parentCode: 'SE', description: '봉사부 운영', sortOrder: 1 },
  { code: 'SE-HO', name: '희망봉사단', englishName: 'Hope Service Team Department', level: 'LEVEL_2', parentCode: 'SE', description: '희망봉사단 운영', sortOrder: 2 },
  { code: 'SE-WE', name: '결혼예식부', englishName: 'Wedding Service Department', level: 'LEVEL_2', parentCode: 'SE', description: '결혼예식 담당', sortOrder: 3 },
  { code: 'SE-FU', name: '장례예식부', englishName: 'Funeral Service Department', level: 'LEVEL_2', parentCode: 'SE', description: '장례예식 담당', sortOrder: 4 },
  { code: 'SE-HL', name: '노숙인사역팀', englishName: 'Homeless Ministry Team Department', level: 'LEVEL_2', parentCode: 'SE', description: '노숙인사역 담당', sortOrder: 5 },
  { code: 'SE-BE', name: '이미용사역팀', englishName: 'Beauty Service Team Department', level: 'LEVEL_2', parentCode: 'SE', description: '이미용사역 담당', sortOrder: 6 },
  { code: 'SE-FO', name: '노인복지배식사역팀', englishName: 'Senior Food Service Team Department', level: 'LEVEL_2', parentCode: 'SE', description: '노인복지배식사역 담당', sortOrder: 7 },
  { code: 'SE-HP', name: '호스피스사역팀', englishName: 'Hospice Care Team Department', level: 'LEVEL_2', parentCode: 'SE', description: '호스피스사역 담당', sortOrder: 8 },

  // 교육위원회들 하위 조직
  { code: 'AE-AE', name: '장년교육부', englishName: 'Adult Education Department', level: 'LEVEL_2', parentCode: 'AE', description: '장년교육 담당', sortOrder: 1 },
  { code: 'AE-HH', name: '행복지기세움터', englishName: 'Happiness Builder Center Department', level: 'LEVEL_2', parentCode: 'AE', description: '행복지기세움터 운영', sortOrder: 2 },
  { code: 'AE-FA', name: '가정사역부', englishName: 'Family Ministry Department', level: 'LEVEL_2', parentCode: 'AE', description: '가정사역 담당', sortOrder: 3 },

  { code: 'NE-PL', name: '교육기획부', englishName: 'Education Planning Department', level: 'LEVEL_2', parentCode: 'NE', description: '교육기획 담당', sortOrder: 1 },
  { code: 'NE-HL', name: '하늘사랑', englishName: 'Heaven Love Department', level: 'LEVEL_2', parentCode: 'NE', description: '영유아 교육 부서', sortOrder: 2 },
  { code: 'NE-HI', name: '하늘생명', englishName: 'Heaven Life Department', level: 'LEVEL_2', parentCode: 'NE', description: '초등 교육 부서', sortOrder: 3 },
  { code: 'NE-HP', name: '하늘평화', englishName: 'Heaven Peace Department', level: 'LEVEL_2', parentCode: 'NE', description: '중고등 교육 부서', sortOrder: 4 },

  // 기타 위원회들 하위 조직
  { code: 'CU-CU', name: '문화사역부', englishName: 'Cultural Ministry Department', level: 'LEVEL_2', parentCode: 'CU', description: '문화사역 담당', sortOrder: 1 },
  { code: 'CU-CA', name: '카페벳새다부', englishName: 'Cafe Bethesda Department', level: 'LEVEL_2', parentCode: 'CU', description: '카페벳새다 운영', sortOrder: 2 },
  { code: 'CU-CL', name: '동호회부', englishName: 'Club Department', level: 'LEVEL_2', parentCode: 'CU', description: '동호회 운영', sortOrder: 3 },
  { code: 'CU-NE', name: '하늘행복소식지', englishName: 'Heaven Happiness Newsletter Department', level: 'LEVEL_2', parentCode: 'CU', description: '하늘행복소식지 발간', sortOrder: 4 },

  { code: 'DI-EB', name: '에바다부', englishName: 'Ephphatha Department', level: 'LEVEL_2', parentCode: 'DI', description: '에바다부 운영', sortOrder: 1 },
  { code: 'DI-LO', name: '사랑부', englishName: 'Love Department', level: 'LEVEL_2', parentCode: 'DI', description: '사랑부 운영', sortOrder: 2 },

  { code: 'MA-AM', name: '행정관리부', englishName: 'Administration Management Department', level: 'LEVEL_2', parentCode: 'MA', description: '행정관리 담당', sortOrder: 1 },
  { code: 'MA-BU', name: '건물관리부', englishName: 'Building Management Department', level: 'LEVEL_2', parentCode: 'MA', description: '건물관리 담당', sortOrder: 2 },
  { code: 'MA-FO', name: '식당관리부', englishName: 'Food Service Management Department', level: 'LEVEL_2', parentCode: 'MA', description: '식당관리 담당', sortOrder: 3 },
  { code: 'MA-SA', name: '안전관리부', englishName: 'Safety Management Department', level: 'LEVEL_2', parentCode: 'MA', description: '안전관리 담당', sortOrder: 4 },

  { code: 'ME-ME', name: '미디어사역부', englishName: 'Media Ministry Department', level: 'LEVEL_2', parentCode: 'ME', description: '미디어사역 담당', sortOrder: 1 },

  { code: 'EX-EX', name: '대외협력부', englishName: 'External Relations Department', level: 'LEVEL_2', parentCode: 'EX', description: '대외협력 담당', sortOrder: 1 },
  { code: 'EX-HE', name: '이단대책부', englishName: 'Heresy Response Department', level: 'LEVEL_2', parentCode: 'EX', description: '이단대책 담당', sortOrder: 2 },

  { code: 'FI-AC1', name: '회계1부', englishName: 'Accounting 1st Department', level: 'LEVEL_2', parentCode: 'FI', description: '회계1부 담당', sortOrder: 1 },
  { code: 'FI-AC2', name: '회계2부', englishName: 'Accounting 2nd Department', level: 'LEVEL_2', parentCode: 'FI', description: '회계2부 담당', sortOrder: 2 },

  { code: 'AU-AU', name: '감사부', englishName: 'Audit Department', level: 'LEVEL_2', parentCode: 'AU', description: '감사 담당', sortOrder: 1 },

  { code: 'VE-VE', name: '차량관리부', englishName: 'Vehicle Management Department', level: 'LEVEL_2', parentCode: 'VE', description: '차량관리 담당', sortOrder: 1 },
  { code: 'VE-PA', name: '주차관리부', englishName: 'Parking Management Department', level: 'LEVEL_2', parentCode: 'VE', description: '주차관리 담당', sortOrder: 2 },

  { code: 'NF-NF', name: '새가족부', englishName: 'Newcomers Department', level: 'LEVEL_2', parentCode: 'NF', description: '새가족사역 담당', sortOrder: 1 },

  { code: 'SC-SC', name: '장학부', englishName: 'Scholarship Department', level: 'LEVEL_2', parentCode: 'SC', description: '장학사업 담당', sortOrder: 1 },

  { code: 'CC-OP', name: '운영위원', englishName: 'Operation Committee Department', level: 'LEVEL_2', parentCode: 'CC', description: '운영위원 담당', sortOrder: 1 },
  { code: 'CC-DI', name: '센터장', englishName: 'Director Department', level: 'LEVEL_2', parentCode: 'CC', description: '센터장', sortOrder: 2 },
  { code: 'CC-TM', name: '총괄팀장', englishName: 'Team Manager Department', level: 'LEVEL_2', parentCode: 'CC', description: '총괄팀장', sortOrder: 3 },
  { code: 'CC-ST', name: '사무간사', englishName: 'Secretary Department', level: 'LEVEL_2', parentCode: 'CC', description: '사무간사', sortOrder: 4 },

  { code: 'YC-OP', name: '운영위원', englishName: 'Operation Committee Department', level: 'LEVEL_2', parentCode: 'YC', description: '운영위원 담당', sortOrder: 1 },
  { code: 'YC-PA', name: '지도교역자', englishName: 'Pastor Department', level: 'LEVEL_2', parentCode: 'YC', description: '지도교역자', sortOrder: 2 },
  { code: 'YC-TM', name: '총괄팀장', englishName: 'Team Manager Department', level: 'LEVEL_2', parentCode: 'YC', description: '총괄팀장', sortOrder: 3 },

  // LEVEL_3: 세부 부서들 (일부만 예시로 작성)
  
  // 교구 - 목장부/구역부
  { code: 'DC-01-MO', name: '목장부', englishName: 'Mokjang Department', level: 'LEVEL_3', parentCode: 'DC-01', description: '1교구 목장 운영 및 관리', sortOrder: 1 },
  { code: 'DC-01-ZO', name: '구역부', englishName: 'Zone Department', level: 'LEVEL_3', parentCode: 'DC-01', description: '1교구 구역 관리', sortOrder: 2 },
  { code: 'DC-02-MO', name: '목장부', englishName: 'Mokjang Department', level: 'LEVEL_3', parentCode: 'DC-02', description: '2교구 목장 운영 및 관리', sortOrder: 1 },
  { code: 'DC-02-ZO', name: '구역부', englishName: 'Zone Department', level: 'LEVEL_3', parentCode: 'DC-02', description: '2교구 구역 관리', sortOrder: 2 },

  // 행정사역부 하위 팀들
  { code: 'AD-AM-OF', name: '사무팀', englishName: 'Office Team', level: 'LEVEL_3', parentCode: 'AD-AM', description: '일반 사무 업무', sortOrder: 1 },
  { code: 'AD-AM-HR', name: '인사팀', englishName: 'Human Resources Team', level: 'LEVEL_3', parentCode: 'AD-AM', description: '교직원 관리', sortOrder: 2 },

  // 청년부 하위 팀들
  { code: 'YO-Y1-WO', name: '예배팀', englishName: 'Worship Team', level: 'LEVEL_3', parentCode: 'YO-Y1', description: '1청년부 예배 준비 및 진행', sortOrder: 1 },
  { code: 'YO-Y1-FE', name: '친교팀', englishName: 'Fellowship Team', level: 'LEVEL_3', parentCode: 'YO-Y1', description: '1청년부 친교 활동', sortOrder: 2 },
  { code: 'YO-Y2-WO', name: '예배팀', englishName: 'Worship Team', level: 'LEVEL_3', parentCode: 'YO-Y2', description: '2청년부 예배 준비 및 진행', sortOrder: 1 },
  { code: 'YO-Y2-FE', name: '친교팀', englishName: 'Fellowship Team', level: 'LEVEL_3', parentCode: 'YO-Y2', description: '2청년부 친교 활동', sortOrder: 2 },

  // 찬양사역위원회 하위 팀들
  { code: 'PR-GI-CH', name: '합창팀', englishName: 'Choir Team', level: 'LEVEL_3', parentCode: 'PR-GI', description: '기드온찬양대 합창', sortOrder: 1 },
  { code: 'PR-GI-OR', name: '오케스트라팀', englishName: 'Orchestra Team', level: 'LEVEL_3', parentCode: 'PR-GI', description: '기드온찬양대 오케스트라', sortOrder: 2 },
  { code: 'PR-HI-VO', name: '보컬팀', englishName: 'Vocal Team', level: 'LEVEL_3', parentCode: 'PR-HI', description: '히스피플 보컬팀', sortOrder: 1 },
  { code: 'PR-HI-IN', name: '악기팀', englishName: 'Instrument Team', level: 'LEVEL_3', parentCode: 'PR-HI', description: '히스피플 악기팀', sortOrder: 2 },

  // 예배찬양위원회 하위 팀들
  { code: 'WO-WO-SE', name: '예배준비팀', englishName: 'Service Preparation Team', level: 'LEVEL_3', parentCode: 'WO-WO', description: '예배 준비 담당', sortOrder: 1 },
  { code: 'WO-WO-US', name: '안내팀', englishName: 'Usher Team', level: 'LEVEL_3', parentCode: 'WO-WO', description: '안내 서비스 담당', sortOrder: 2 },

  { code: 'WO-SA-BA', name: '세례팀', englishName: 'Baptism Team', level: 'LEVEL_3', parentCode: 'WO-SA', description: '세례식 준비 및 관리', sortOrder: 1 },
  { code: 'WO-SA-CO', name: '성찬팀', englishName: 'Communion Team', level: 'LEVEL_3', parentCode: 'WO-SA', description: '성찬식 준비 및 관리', sortOrder: 2 },

  { code: 'WO-PR-IN', name: '중보기도팀', englishName: 'Intercession Team', level: 'LEVEL_3', parentCode: 'WO-PR', description: '중보기도 담당', sortOrder: 1 },
  { code: 'WO-PR-HE', name: '치유기도팀', englishName: 'Healing Prayer Team', level: 'LEVEL_3', parentCode: 'WO-PR', description: '치유기도 담당', sortOrder: 2 },

  { code: 'WO-MO-PR', name: '자녀기도팀', englishName: 'Children Prayer Team', level: 'LEVEL_3', parentCode: 'WO-MO', description: '자녀를 위한 기도', sortOrder: 1 },
  { code: 'WO-MO-FE', name: '어머니친교팀', englishName: 'Mothers\' Fellowship Team', level: 'LEVEL_3', parentCode: 'WO-MO', description: '어머니 친교 활동', sortOrder: 2 },

  // 찬양1부 하위 팀들
  { code: 'WO-C1-SH', name: '샬롬', englishName: 'Shalom Choir', level: 'LEVEL_3', parentCode: 'WO-C1', description: '샬롬 찬양단', sortOrder: 1 },
  { code: 'WO-C1-HO', name: '호산나', englishName: 'Hosanna Choir', level: 'LEVEL_3', parentCode: 'WO-C1', description: '호산나 찬양단', sortOrder: 2 },
  { code: 'WO-C1-HA', name: '할렐루야', englishName: 'Hallelujah Choir', level: 'LEVEL_3', parentCode: 'WO-C1', description: '할렐루야 찬양단', sortOrder: 3 },
  { code: 'WO-C1-IM', name: '임마누엘', englishName: 'Immanuel Choir', level: 'LEVEL_3', parentCode: 'WO-C1', description: '임마누엘 찬양단', sortOrder: 4 },

  // 찬양2부 하위 팀들
  { code: 'WO-C2-OR', name: '하늘울림 오케스트라', englishName: 'Heaven Sound Orchestra', level: 'LEVEL_3', parentCode: 'WO-C2', description: '하늘울림 오케스트라', sortOrder: 1 },
  { code: 'WO-C2-HB', name: '하늘종소리 핸드벨', englishName: 'Heaven Bell Handbell', level: 'LEVEL_3', parentCode: 'WO-C2', description: '하늘종소리 핸드벨', sortOrder: 2 },
  { code: 'WO-C2-CH', name: '많은물소리 합창단', englishName: 'Many Waters Choir', level: 'LEVEL_3', parentCode: 'WO-C2', description: '많은물소리 합창단', sortOrder: 3 },
  { code: 'WO-C2-HF', name: '하늘향기 찬양단', englishName: 'Heaven Fragrance Praise Team', level: 'LEVEL_3', parentCode: 'WO-C2', description: '하늘향기 찬양단', sortOrder: 4 },
  { code: 'WO-C2-DR', name: '드림찬양단', englishName: 'Dream Praise Team', level: 'LEVEL_3', parentCode: 'WO-C2', description: '드림찬양단', sortOrder: 5 },

  // 선교위원회들 하위 팀들
  { code: 'WM-WM-AS', name: '아시아선교팀', englishName: 'Asia Mission Team', level: 'LEVEL_3', parentCode: 'WM-WM', description: '아시아 선교 담당', sortOrder: 1 },
  { code: 'WM-WM-AF', name: '아프리카선교팀', englishName: 'Africa Mission Team', level: 'LEVEL_3', parentCode: 'WM-WM', description: '아프리카 선교 담당', sortOrder: 2 },
  { code: 'WM-WM-AM', name: '아메리카선교팀', englishName: 'America Mission Team', level: 'LEVEL_3', parentCode: 'WM-WM', description: '아메리카 선교 담당', sortOrder: 3 },

  { code: 'WM-TR-BA', name: '기초훈련팀', englishName: 'Basic Training Team', level: 'LEVEL_3', parentCode: 'WM-TR', description: '기초 선교훈련', sortOrder: 1 },
  { code: 'WM-TR-AD', name: '심화훈련팀', englishName: 'Advanced Training Team', level: 'LEVEL_3', parentCode: 'WM-TR', description: '심화 선교훈련', sortOrder: 2 },

  // 전도위원회 하위 팀들
  { code: 'EV-HE-ST', name: '길거리전도팀', englishName: 'Street Evangelism Team', level: 'LEVEL_3', parentCode: 'EV-HE', description: '길거리 전도 활동', sortOrder: 1 },
  { code: 'EV-HE-VI', name: '방문전도팀', englishName: 'Visiting Evangelism Team', level: 'LEVEL_3', parentCode: 'EV-HE', description: '방문 전도 활동', sortOrder: 2 },

  // 봉사위원회 하위 팀들
  { code: 'SE-WE-CE', name: '예식팀', englishName: 'Ceremony Team', level: 'LEVEL_3', parentCode: 'SE-WE', description: '결혼예식 진행', sortOrder: 1 },
  { code: 'SE-WE-MU', name: '음악팀', englishName: 'Music Team', level: 'LEVEL_3', parentCode: 'SE-WE', description: '결혼예식 음악', sortOrder: 2 },
  { code: 'SE-FU-CE', name: '예식팀', englishName: 'Ceremony Team', level: 'LEVEL_3', parentCode: 'SE-FU', description: '장례예식 진행', sortOrder: 1 },
  { code: 'SE-FU-SU', name: '지원팀', englishName: 'Support Team', level: 'LEVEL_3', parentCode: 'SE-FU', description: '장례예식 지원', sortOrder: 2 },

  // 장년교육위원회 하위 팀들
  { code: 'AE-AE-BI', name: '성경공부팀', englishName: 'Bible Study Team', level: 'LEVEL_3', parentCode: 'AE-AE', description: '성경공부 진행', sortOrder: 1 },
  { code: 'AE-AE-DI', name: '제자훈련팀', englishName: 'Discipleship Team', level: 'LEVEL_3', parentCode: 'AE-AE', description: '제자훈련 진행', sortOrder: 2 },

  // 다음세대교육위원회 - 하늘사랑 하위 팀들
  { code: 'NE-HL-IN', name: '영아부', englishName: 'Infant Department', level: 'LEVEL_3', parentCode: 'NE-HL', description: '영아 교육 담당', sortOrder: 1 },
  { code: 'NE-HL-TO', name: '유아부', englishName: 'Toddler Department', level: 'LEVEL_3', parentCode: 'NE-HL', description: '유아 교육 담당', sortOrder: 2 },
  { code: 'NE-HL-KI', name: '유치부', englishName: 'Kindergarten Department', level: 'LEVEL_3', parentCode: 'NE-HL', description: '유치원생 교육 담당', sortOrder: 3 },
  { code: 'NE-HL-BA', name: '아기학교', englishName: 'Baby School Department', level: 'LEVEL_3', parentCode: 'NE-HL', description: '아기학교 운영', sortOrder: 4 },

  // 다음세대교육위원회 - 하늘생명 하위 팀들
  { code: 'NE-HI-SA', name: '토요학교', englishName: 'Saturday School Department', level: 'LEVEL_3', parentCode: 'NE-HI', description: '토요학교 운영', sortOrder: 1 },
  { code: 'NE-HI-E1', name: '어린이1부', englishName: 'Elementary 1st Department', level: 'LEVEL_3', parentCode: 'NE-HI', description: '초등 저학년 교육', sortOrder: 2 },
  { code: 'NE-HI-E2', name: '어린이2부', englishName: 'Elementary 2nd Department', level: 'LEVEL_3', parentCode: 'NE-HI', description: '초등 중학년 교육', sortOrder: 3 },
  { code: 'NE-HI-E3', name: '어린이3부', englishName: 'Elementary 3rd Department', level: 'LEVEL_3', parentCode: 'NE-HI', description: '초등 고학년 교육', sortOrder: 4 },
  { code: 'NE-HI-DR', name: '꿈둥이부', englishName: 'Dream Kids Department', level: 'LEVEL_3', parentCode: 'NE-HI', description: '꿈둥이부 운영', sortOrder: 5 },

  // 다음세대교육위원회 - 하늘평화 하위 팀들
  { code: 'NE-HP-MI', name: '중등부', englishName: 'Middle School Department', level: 'LEVEL_3', parentCode: 'NE-HP', description: '중학생 교육 담당', sortOrder: 1 },
  { code: 'NE-HP-HI', name: '고등부', englishName: 'High School Department', level: 'LEVEL_3', parentCode: 'NE-HP', description: '고등학생 교육 담당', sortOrder: 2 },

  // LEVEL_4: 세부 팀/그룹들 (일부만 예시로 작성)
  
  // 교구 목장/구역
  { code: 'DC-01-MO-01', name: '1목장', englishName: 'Mokjang Team 1', level: 'LEVEL_4', parentCode: 'DC-01-MO', description: '1교구 1목장', sortOrder: 1 },
  { code: 'DC-01-MO-02', name: '2목장', englishName: 'Mokjang Team 2', level: 'LEVEL_4', parentCode: 'DC-01-MO', description: '1교구 2목장', sortOrder: 2 },
  { code: 'DC-01-ZO-01', name: '1구역', englishName: 'Zone Team 1', level: 'LEVEL_4', parentCode: 'DC-01-ZO', description: '1교구 1구역', sortOrder: 1 },
  { code: 'DC-01-ZO-02', name: '2구역', englishName: 'Zone Team 2', level: 'LEVEL_4', parentCode: 'DC-01-ZO', description: '1교구 2구역', sortOrder: 2 },

  { code: 'DC-02-MO-01', name: '1목장', englishName: 'Mokjang Team 1', level: 'LEVEL_4', parentCode: 'DC-02-MO', description: '2교구 1목장', sortOrder: 1 },
  { code: 'DC-02-ZO-01', name: '1구역', englishName: 'Zone Team 1', level: 'LEVEL_4', parentCode: 'DC-02-ZO', description: '2교구 1구역', sortOrder: 1 },

  // 행정사역부 세부 팀들
  { code: 'AD-AM-OF-GE', name: '총무팀', englishName: 'General Affairs Team', level: 'LEVEL_4', parentCode: 'AD-AM-OF', description: '교회 총무 업무', sortOrder: 1 },
  { code: 'AD-AM-OF-DO', name: '문서팀', englishName: 'Document Team', level: 'LEVEL_4', parentCode: 'AD-AM-OF', description: '문서 작성 및 관리', sortOrder: 2 },
  { code: 'AD-AM-HR-ST', name: '교역자관리', englishName: 'Staff Management', level: 'LEVEL_4', parentCode: 'AD-AM-HR', description: '교역자 인사 관리', sortOrder: 1 },
  { code: 'AD-AM-HR-WO', name: '직원관리', englishName: 'Worker Management', level: 'LEVEL_4', parentCode: 'AD-AM-HR', description: '일반 직원 관리', sortOrder: 2 },

  // 청년부 세부 팀들
  { code: 'YO-Y1-WO-LE', name: '예배인도팀', englishName: 'Worship Leading Team', level: 'LEVEL_4', parentCode: 'YO-Y1-WO', description: '예배 인도자 팀', sortOrder: 1 },
  { code: 'YO-Y1-WO-MU', name: '찬양팀', englishName: 'Music Team', level: 'LEVEL_4', parentCode: 'YO-Y1-WO', description: '찬양 및 연주팀', sortOrder: 2 },
  { code: 'YO-Y1-FE-EV', name: '행사팀', englishName: 'Event Team', level: 'LEVEL_4', parentCode: 'YO-Y1-FE', description: '청년부 행사 기획', sortOrder: 1 },
  { code: 'YO-Y1-FE-CA', name: '돌봄팀', englishName: 'Care Team', level: 'LEVEL_4', parentCode: 'YO-Y1-FE', description: '청년 돌봄 및 상담', sortOrder: 2 },

  // 찬양사역위원회 세부 팀들
  { code: 'PR-GI-CH-SO', name: '소프라노', englishName: 'Soprano', level: 'LEVEL_4', parentCode: 'PR-GI-CH', description: '기드온찬양대 소프라노', sortOrder: 1 },
  { code: 'PR-GI-CH-AL', name: '알토', englishName: 'Alto', level: 'LEVEL_4', parentCode: 'PR-GI-CH', description: '기드온찬양대 알토', sortOrder: 2 },
  { code: 'PR-GI-CH-TE', name: '테너', englishName: 'Tenor', level: 'LEVEL_4', parentCode: 'PR-GI-CH', description: '기드온찬양대 테너', sortOrder: 3 },
  { code: 'PR-GI-CH-BA', name: '베이스', englishName: 'Bass', level: 'LEVEL_4', parentCode: 'PR-GI-CH', description: '기드온찬양대 베이스', sortOrder: 4 },
  { code: 'PR-GI-OR-ST', name: '현악기', englishName: 'Strings', level: 'LEVEL_4', parentCode: 'PR-GI-OR', description: '기드온 현악기', sortOrder: 1 },
  { code: 'PR-GI-OR-WI', name: '관악기', englishName: 'Winds', level: 'LEVEL_4', parentCode: 'PR-GI-OR', description: '기드온 관악기', sortOrder: 2 },

  // 예배위원회 세부 팀들
  { code: 'WO-WO-SE-SE', name: '예배순서팀', englishName: 'Service Order Team', level: 'LEVEL_4', parentCode: 'WO-WO-SE', description: '예배순서 준비', sortOrder: 1 },
  { code: 'WO-WO-SE-DE', name: '예배장식팀', englishName: 'Decoration Team', level: 'LEVEL_4', parentCode: 'WO-WO-SE', description: '예배 장식 담당', sortOrder: 2 },
  { code: 'WO-WO-US-WE', name: '환영팀', englishName: 'Welcome Team', level: 'LEVEL_4', parentCode: 'WO-WO-US', description: '교인 환영 담당', sortOrder: 1 },
  { code: 'WO-WO-US-GU', name: '좌석안내팀', englishName: 'Guide Team', level: 'LEVEL_4', parentCode: 'WO-WO-US', description: '좌석 안내 담당', sortOrder: 2 },

  // 찬양1부 세부 팀들
  { code: 'WO-C1-SH-VO', name: '보컬팀', englishName: 'Vocal Team', level: 'LEVEL_4', parentCode: 'WO-C1-SH', description: '샬롬 보컬팀', sortOrder: 1 },
  { code: 'WO-C1-SH-IN', name: '악기팀', englishName: 'Instrument Team', level: 'LEVEL_4', parentCode: 'WO-C1-SH', description: '샬롬 악기팀', sortOrder: 2 },
  { code: 'WO-C1-HO-VO', name: '보컬팀', englishName: 'Vocal Team', level: 'LEVEL_4', parentCode: 'WO-C1-HO', description: '호산나 보컬팀', sortOrder: 1 },
  { code: 'WO-C1-HO-IN', name: '악기팀', englishName: 'Instrument Team', level: 'LEVEL_4', parentCode: 'WO-C1-HO', description: '호산나 악기팀', sortOrder: 2 },

  // 찬양2부 세부 팀들
  { code: 'WO-C2-OR-ST', name: '현악팀', englishName: 'String Team', level: 'LEVEL_4', parentCode: 'WO-C2-OR', description: '오케스트라 현악팀', sortOrder: 1 },
  { code: 'WO-C2-OR-WI', name: '관악팀', englishName: 'Wind Team', level: 'LEVEL_4', parentCode: 'WO-C2-OR', description: '오케스트라 관악팀', sortOrder: 2 },
  { code: 'WO-C2-OR-PE', name: '타악팀', englishName: 'Percussion Team', level: 'LEVEL_4', parentCode: 'WO-C2-OR', description: '오케스트라 타악팀', sortOrder: 3 },
  { code: 'WO-C2-HB-BE', name: '핸드벨팀', englishName: 'Handbell Team', level: 'LEVEL_4', parentCode: 'WO-C2-HB', description: '하늘종소리 핸드벨팀', sortOrder: 1 },
  { code: 'WO-C2-HB-CH', name: '차임팀', englishName: 'Chime Team', level: 'LEVEL_4', parentCode: 'WO-C2-HB', description: '하늘종소리 차임팀', sortOrder: 2 },

  // 다음세대교육위원회 학급들
  { code: 'NE-HL-IN-01', name: '영아1반', englishName: 'Infant Class 1', level: 'LEVEL_4', parentCode: 'NE-HL-IN', description: '영아1반', sortOrder: 1 },
  { code: 'NE-HL-IN-02', name: '영아2반', englishName: 'Infant Class 2', level: 'LEVEL_4', parentCode: 'NE-HL-IN', description: '영아2반', sortOrder: 2 },
  { code: 'NE-HL-TO-01', name: '유아1반', englishName: 'Toddler Class 1', level: 'LEVEL_4', parentCode: 'NE-HL-TO', description: '유아1반', sortOrder: 1 },
  { code: 'NE-HL-TO-02', name: '유아2반', englishName: 'Toddler Class 2', level: 'LEVEL_4', parentCode: 'NE-HL-TO', description: '유아2반', sortOrder: 2 },
  { code: 'NE-HL-KI-01', name: '유치1반', englishName: 'Kindergarten Class 1', level: 'LEVEL_4', parentCode: 'NE-HL-KI', description: '유치1반', sortOrder: 1 },
  { code: 'NE-HL-KI-02', name: '유치2반', englishName: 'Kindergarten Class 2', level: 'LEVEL_4', parentCode: 'NE-HL-KI', description: '유치2반', sortOrder: 2 },

  { code: 'NE-HI-E1-01', name: '1학년반', englishName: 'Grade 1 Class', level: 'LEVEL_4', parentCode: 'NE-HI-E1', description: '1학년반', sortOrder: 1 },
  { code: 'NE-HI-E1-02', name: '2학년반', englishName: 'Grade 2 Class', level: 'LEVEL_4', parentCode: 'NE-HI-E1', description: '2학년반', sortOrder: 2 },
  { code: 'NE-HI-E1-03', name: '3학년반', englishName: 'Grade 3 Class', level: 'LEVEL_4', parentCode: 'NE-HI-E1', description: '3학년반', sortOrder: 3 },
  { code: 'NE-HI-E2-04', name: '4학년반', englishName: 'Grade 4 Class', level: 'LEVEL_4', parentCode: 'NE-HI-E2', description: '4학년반', sortOrder: 1 },
  { code: 'NE-HI-E2-05', name: '5학년반', englishName: 'Grade 5 Class', level: 'LEVEL_4', parentCode: 'NE-HI-E2', description: '5학년반', sortOrder: 2 },
  { code: 'NE-HI-E3-06', name: '6학년반', englishName: 'Grade 6 Class', level: 'LEVEL_4', parentCode: 'NE-HI-E3', description: '6학년반', sortOrder: 1 },

  { code: 'NE-HP-MI-07', name: '중1반', englishName: 'Middle 1st Class', level: 'LEVEL_4', parentCode: 'NE-HP-MI', description: '중1반', sortOrder: 1 },
  { code: 'NE-HP-MI-08', name: '중2반', englishName: 'Middle 2nd Class', level: 'LEVEL_4', parentCode: 'NE-HP-MI', description: '중2반', sortOrder: 2 },
  { code: 'NE-HP-MI-09', name: '중3반', englishName: 'Middle 3rd Class', level: 'LEVEL_4', parentCode: 'NE-HP-MI', description: '중3반', sortOrder: 3 },
  { code: 'NE-HP-HI-10', name: '고1반', englishName: 'High 1st Class', level: 'LEVEL_4', parentCode: 'NE-HP-HI', description: '고1반', sortOrder: 1 },
  { code: 'NE-HP-HI-11', name: '고2반', englishName: 'High 2nd Class', level: 'LEVEL_4', parentCode: 'NE-HP-HI', description: '고2반', sortOrder: 2 },
  { code: 'NE-HP-HI-12', name: '고3반', englishName: 'High 3rd Class', level: 'LEVEL_4', parentCode: 'NE-HP-HI', description: '고3반', sortOrder: 3 },

  // 문화사역위원회 세부 팀들
  { code: 'CU-CA-OP', name: '운영팀', englishName: 'Operation Team', level: 'LEVEL_3', parentCode: 'CU-CA', description: '카페벳새다 운영', sortOrder: 1 },
  { code: 'CU-CA-SE', name: '서비스팀', englishName: 'Service Team', level: 'LEVEL_3', parentCode: 'CU-CA', description: '카페벳새다 서비스', sortOrder: 2 },
  { code: 'CU-CL-SP', name: '스포츠동호회', englishName: 'Sports Club', level: 'LEVEL_3', parentCode: 'CU-CL', description: '스포츠동호회', sortOrder: 1 },
  { code: 'CU-CL-AR', name: '예술동호회', englishName: 'Arts Club', level: 'LEVEL_3', parentCode: 'CU-CL', description: '예술동호회', sortOrder: 2 },
  { code: 'CU-NE-ED', name: '편집팀', englishName: 'Editorial Team', level: 'LEVEL_3', parentCode: 'CU-NE', description: '하늘행복소식지 편집', sortOrder: 1 },
  { code: 'CU-NE-DE', name: '디자인팀', englishName: 'Design Team', level: 'LEVEL_3', parentCode: 'CU-NE', description: '하늘행복소식지 디자인', sortOrder: 2 },

  // 장애인사역위원회 세부 팀들
  { code: 'DI-EB-WO', name: '예배팀', englishName: 'Worship Team', level: 'LEVEL_3', parentCode: 'DI-EB', description: '에바다부 예배', sortOrder: 1 },
  { code: 'DI-EB-CA', name: '돌봄팀', englishName: 'Care Team', level: 'LEVEL_3', parentCode: 'DI-EB', description: '에바다부 돌봄', sortOrder: 2 },
  { code: 'DI-LO-ED', name: '교육팀', englishName: 'Education Team', level: 'LEVEL_3', parentCode: 'DI-LO', description: '사랑부 교육', sortOrder: 1 },
  { code: 'DI-LO-SU', name: '지원팀', englishName: 'Support Team', level: 'LEVEL_3', parentCode: 'DI-LO', description: '사랑부 지원', sortOrder: 2 },

  // 관리위원회 세부 팀들
  { code: 'MA-AM-GE', name: '총무팀', englishName: 'General Affairs Team', level: 'LEVEL_3', parentCode: 'MA-AM', description: '관리위원회 총무', sortOrder: 1 },
  { code: 'MA-AM-DO', name: '문서관리팀', englishName: 'Document Management Team', level: 'LEVEL_3', parentCode: 'MA-AM', description: '문서 관리', sortOrder: 2 },
  { code: 'MA-BU-FA', name: '시설팀', englishName: 'Facility Team', level: 'LEVEL_3', parentCode: 'MA-BU', description: '건물 시설 관리', sortOrder: 1 },
  { code: 'MA-BU-CL', name: '청소팀', englishName: 'Cleaning Team', level: 'LEVEL_3', parentCode: 'MA-BU', description: '건물 청소 관리', sortOrder: 2 },
  { code: 'MA-FO-KI', name: '주방팀', englishName: 'Kitchen Team', level: 'LEVEL_3', parentCode: 'MA-FO', description: '식당 주방 관리', sortOrder: 1 },
  { code: 'MA-FO-SE', name: '서빙팀', englishName: 'Serving Team', level: 'LEVEL_3', parentCode: 'MA-FO', description: '식당 서빙 관리', sortOrder: 2 },
  { code: 'MA-SA-SE', name: '보안팀', englishName: 'Security Team', level: 'LEVEL_3', parentCode: 'MA-SA', description: '건물 보안 관리', sortOrder: 1 },
  { code: 'MA-SA-FI', name: '소방팀', englishName: 'Fire Safety Team', level: 'LEVEL_3', parentCode: 'MA-SA', description: '화재 안전 관리', sortOrder: 2 },

  // 미디어사역위원회 세부 팀들
  { code: 'ME-ME-VI', name: '영상팀', englishName: 'Video Team', level: 'LEVEL_3', parentCode: 'ME-ME', description: '영상 제작 담당', sortOrder: 1 },
  { code: 'ME-ME-AU', name: '음향팀', englishName: 'Audio Team', level: 'LEVEL_3', parentCode: 'ME-ME', description: '음향 담당', sortOrder: 2 },

  // 미디어 세부 팀들
  { code: 'ME-ME-VI-CA', name: '촬영팀', englishName: 'Camera Team', level: 'LEVEL_4', parentCode: 'ME-ME-VI', description: '영상 촬영', sortOrder: 1 },
  { code: 'ME-ME-VI-ED', name: '편집팀', englishName: 'Editing Team', level: 'LEVEL_4', parentCode: 'ME-ME-VI', description: '영상 편집', sortOrder: 2 },
  { code: 'ME-ME-AU-SO', name: '음향조정팀', englishName: 'Sound Control Team', level: 'LEVEL_4', parentCode: 'ME-ME-AU', description: '음향 조정', sortOrder: 1 },
  { code: 'ME-ME-AU-RE', name: '녹음팀', englishName: 'Recording Team', level: 'LEVEL_4', parentCode: 'ME-ME-AU', description: '음향 녹음', sortOrder: 2 },

  // 대외협력위원회 세부 팀들
  { code: 'EX-EX-CH', name: '타교회협력팀', englishName: 'Church Cooperation Team', level: 'LEVEL_3', parentCode: 'EX-EX', description: '타교회 협력', sortOrder: 1 },
  { code: 'EX-EX-SO', name: '사회협력팀', englishName: 'Social Cooperation Team', level: 'LEVEL_3', parentCode: 'EX-EX', description: '사회단체 협력', sortOrder: 2 },
  { code: 'EX-HE-RE', name: '연구팀', englishName: 'Research Team', level: 'LEVEL_3', parentCode: 'EX-HE', description: '이단 연구', sortOrder: 1 },
  { code: 'EX-HE-ED', name: '교육팀', englishName: 'Education Team', level: 'LEVEL_3', parentCode: 'EX-HE', description: '이단 교육', sortOrder: 2 },

  // 재정위원회 세부 팀들
  { code: 'FI-AC1-GE', name: '일반회계팀', englishName: 'General Accounting Team', level: 'LEVEL_3', parentCode: 'FI-AC1', description: '일반 회계업무', sortOrder: 1 },
  { code: 'FI-AC1-OF', name: '헌금관리팀', englishName: 'Offering Management Team', level: 'LEVEL_3', parentCode: 'FI-AC1', description: '헌금 관리', sortOrder: 2 },
  { code: 'FI-AC2-BU', name: '예산관리팀', englishName: 'Budget Management Team', level: 'LEVEL_3', parentCode: 'FI-AC2', description: '예산 관리', sortOrder: 1 },
  { code: 'FI-AC2-EX', name: '지출관리팀', englishName: 'Expense Management Team', level: 'LEVEL_3', parentCode: 'FI-AC2', description: '지출 관리', sortOrder: 2 },

  // 감사위원회 세부 팀들
  { code: 'AU-AU-FI', name: '재정감사팀', englishName: 'Financial Audit Team', level: 'LEVEL_3', parentCode: 'AU-AU', description: '재정 감사', sortOrder: 1 },
  { code: 'AU-AU-AD', name: '행정감사팀', englishName: 'Administrative Audit Team', level: 'LEVEL_3', parentCode: 'AU-AU', description: '행정 감사', sortOrder: 2 },

  // 차량관리위원회 세부 팀들
  { code: 'VE-VE-MA', name: '차량정비팀', englishName: 'Vehicle Maintenance Team', level: 'LEVEL_3', parentCode: 'VE-VE', description: '차량 정비', sortOrder: 1 },
  { code: 'VE-VE-DR', name: '운전팀', englishName: 'Driver Team', level: 'LEVEL_3', parentCode: 'VE-VE', description: '운전 서비스', sortOrder: 2 },
  { code: 'VE-PA-IN', name: '실내주차팀', englishName: 'Indoor Parking Team', level: 'LEVEL_3', parentCode: 'VE-PA', description: '실내주차 관리', sortOrder: 1 },
  { code: 'VE-PA-OU', name: '실외주차팀', englishName: 'Outdoor Parking Team', level: 'LEVEL_3', parentCode: 'VE-PA', description: '실외주차 관리', sortOrder: 2 },

  // 새가족위원회 세부 팀들
  { code: 'NF-NF-WE', name: '환영팀', englishName: 'Welcome Team', level: 'LEVEL_3', parentCode: 'NF-NF', description: '새가족 환영', sortOrder: 1 },
  { code: 'NF-NF-FO', name: '정착팀', englishName: 'Follow-up Team', level: 'LEVEL_3', parentCode: 'NF-NF', description: '새가족 정착 지원', sortOrder: 2 },

  // 새가족 세부 팀들
  { code: 'NF-NF-WE-GR', name: '인사팀', englishName: 'Greeting Team', level: 'LEVEL_4', parentCode: 'NF-NF-WE', description: '새가족 인사', sortOrder: 1 },
  { code: 'NF-NF-WE-GI', name: '선물팀', englishName: 'Gift Team', level: 'LEVEL_4', parentCode: 'NF-NF-WE', description: '새가족 선물', sortOrder: 2 },
  { code: 'NF-NF-FO-VI', name: '방문팀', englishName: 'Visiting Team', level: 'LEVEL_4', parentCode: 'NF-NF-FO', description: '새가족 방문', sortOrder: 1 },
  { code: 'NF-NF-FO-CA', name: '상담팀', englishName: 'Counseling Team', level: 'LEVEL_4', parentCode: 'NF-NF-FO', description: '새가족 상담', sortOrder: 2 },

  // 하늘행복장학회 세부 팀들
  { code: 'SC-SC-SE', name: '선발팀', englishName: 'Selection Team', level: 'LEVEL_3', parentCode: 'SC-SC', description: '장학생 선발', sortOrder: 1 },
  { code: 'SC-SC-SU', name: '지원팀', englishName: 'Support Team', level: 'LEVEL_3', parentCode: 'SC-SC', description: '장학생 지원', sortOrder: 2 },

  // 시냇가 상담센터 세부 팀들
  { code: 'CC-TM-CO', name: '상담팀', englishName: 'Counseling Team', level: 'LEVEL_3', parentCode: 'CC-TM', description: '상담 서비스', sortOrder: 1 },
  { code: 'CC-TM-PR', name: '프로그램팀', englishName: 'Program Team', level: 'LEVEL_3', parentCode: 'CC-TM', description: '상담 프로그램', sortOrder: 2 },

  // 상담센터 세부 팀들
  { code: 'CC-TM-CO-IN', name: '개인상담', englishName: 'Individual Counseling', level: 'LEVEL_4', parentCode: 'CC-TM-CO', description: '개인 상담', sortOrder: 1 },
  { code: 'CC-TM-CO-FA', name: '가족상담', englishName: 'Family Counseling', level: 'LEVEL_4', parentCode: 'CC-TM-CO', description: '가족 상담', sortOrder: 2 },
  { code: 'CC-TM-CO-GR', name: '집단상담', englishName: 'Group Counseling', level: 'LEVEL_4', parentCode: 'CC-TM-CO', description: '집단 상담', sortOrder: 3 },

  // 시냇가 청소년센터 세부 팀들
  { code: 'YC-TM-PR', name: '프로그램팀', englishName: 'Program Team', level: 'LEVEL_3', parentCode: 'YC-TM', description: '청소년 프로그램', sortOrder: 1 },
  { code: 'YC-TM-CA', name: '돌봄팀', englishName: 'Care Team', level: 'LEVEL_3', parentCode: 'YC-TM', description: '청소년 돌봄', sortOrder: 2 },

  // 청소년센터 세부 팀들
  { code: 'YC-TM-PR-ED', name: '교육프로그램', englishName: 'Education Program', level: 'LEVEL_4', parentCode: 'YC-TM-PR', description: '교육 프로그램', sortOrder: 1 },
  { code: 'YC-TM-PR-SP', name: '체육프로그램', englishName: 'Sports Program', level: 'LEVEL_4', parentCode: 'YC-TM-PR', description: '체육 프로그램', sortOrder: 2 },
  { code: 'YC-TM-PR-AR', name: '예술프로그램', englishName: 'Arts Program', level: 'LEVEL_4', parentCode: 'YC-TM-PR', description: '예술 프로그램', sortOrder: 3 },
]

async function main() {
  console.log('🌱 에벤에셀교회 완전한 조직구조 시드 시작...')
  
  try {
    // 기존 데이터가 있으면 삭제
    await prisma.organizationMembership.deleteMany()
    await prisma.organization.deleteMany()
    console.log('🗑️  기존 조직 데이터 삭제 완료')

    // 교회 ID 조회 (첫 번째 교회)
    const church = await prisma.church.findFirst()
    if (!church) {
      throw new Error('교회 데이터가 존재하지 않습니다. 먼저 교회 데이터를 생성해주세요.')
    }
    console.log(`🏛️  교회 ID: ${church.id} - ${church.name}`)

    // 조직 코드별 ID 매핑을 위한 맵
    const organizationMap: Record<string, string> = {}

    // 레벨별로 순차적으로 생성 (부모 조직이 먼저 생성되어야 함)
    for (const level of ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4']) {
      const organizationsAtLevel = organizations.filter(org => org.level === level)
      console.log(`📊 ${level} 조직 생성 중... (${organizationsAtLevel.length}개)`)

      for (const orgData of organizationsAtLevel) {
        const { code, name, englishName, level: orgLevel, parentCode, description, sortOrder } = orgData

        // 부모 조직 ID 찾기
        let parentId: string | undefined = undefined
        if (parentCode) {
          parentId = organizationMap[parentCode]
          if (!parentId) {
            console.error(`❌ 부모 조직 코드 '${parentCode}'를 찾을 수 없습니다. (자식: ${code})`)
            continue
          }
        }

        try {
          const organization = await prisma.organization.create({
            data: {
              code,
              name,
              englishName,
              level: orgLevel,
              description,
              sortOrder: sortOrder || 0,
              parentId,
              churchId: church.id,
              isActive: true,
            }
          })

          // 매핑에 추가
          organizationMap[code] = organization.id
          console.log(`  ✅ ${code}: ${name} (${organization.id})`)

        } catch (error) {
          console.error(`❌ 조직 생성 실패 - ${code}: ${name}`, error)
        }
      }
    }

    // 생성된 조직 통계
    const stats = await prisma.organization.groupBy({
      by: ['level'],
      where: { churchId: church.id },
      _count: { level: true },
    })

    console.log('\n📈 조직 생성 완료!')
    console.log('레벨별 생성 현황:')
    for (const stat of stats) {
      console.log(`  ${stat.level}: ${stat._count.level}개`)
    }
    
    const totalCount = stats.reduce((sum, stat) => sum + stat._count.level, 0)
    console.log(`\n🎉 총 ${totalCount}개 조직이 성공적으로 생성되었습니다!`)

  } catch (error) {
    console.error('❌ 시드 실행 중 오류 발생:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })