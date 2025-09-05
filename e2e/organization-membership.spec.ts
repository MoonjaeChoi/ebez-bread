import { test, expect } from '@playwright/test'

test.describe('조직 구성원 관리', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트용 사용자로 로그인
    await page.goto('/dashboard/data-management/organization-memberships')
    
    // 로그인 페이지로 리디렉션되면 로그인
    if (page.url().includes('/auth')) {
      await page.fill('[name="email"]', 'admin@gcchurch.kr')
      await page.fill('[name="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard/**')
    }
  })

  test('조직 구성원 페이지에 접근할 수 있다', async ({ page }) => {
    await expect(page).toHaveTitle(/조직 구성원 관리/)
    await expect(page.locator('h1')).toContainText('조직별 직책 구성원')
  })

  test('조직 선택 드롭다운이 표시된다', async ({ page }) => {
    await expect(page.locator('[data-testid=organization-select]')).toBeVisible()
    await expect(page.locator('text=조직을 선택하세요')).toBeVisible()
  })

  test('조직을 선택하면 구성원 목록이 표시된다', async ({ page }) => {
    // 조직 선택 드롭다운 클릭
    await page.click('[data-testid=organization-select]')
    
    // 첫 번째 조직 선택
    await page.click('[data-testid=organization-option]:first-child')
    
    // 구성원 목록 로드 대기
    await expect(page.locator('[data-testid=member-list]')).toBeVisible({ timeout: 10000 })
    
    // 목록 헤더 확인
    await expect(page.locator('text=구성원 목록')).toBeVisible()
  })

  test('검색 기능이 동작한다', async ({ page }) => {
    // 조직 선택
    await page.click('[data-testid=organization-select]')
    await page.click('[data-testid=organization-option]:first-child')
    
    // 구성원 목록 로드 대기
    await page.waitForSelector('[data-testid=member-list]')
    
    // 검색어 입력
    await page.fill('[data-testid=search-input]', '홍길동')
    
    // 검색 결과 확인 (디바운싱 대기)
    await page.waitForTimeout(500)
    
    // 검색어 삭제 버튼이 표시되는지 확인
    await expect(page.locator('[data-testid=search-clear]')).toBeVisible()
  })

  test('필터링 기능이 동작한다', async ({ page }) => {
    // 조직 선택
    await page.click('[data-testid=organization-select]')
    await page.click('[data-testid=organization-option]:first-child')
    
    // 직책 필터 테스트
    await page.click('[data-testid=role-filter]')
    await page.click('[data-testid=role-option]:first-child')
    
    // 상태 필터 테스트  
    await page.click('[data-testid=status-filter]')
    await page.click('text=모든 구성원')
    
    // 필터가 적용되었는지 확인
    await expect(page.locator('[data-testid=active-filters]')).toBeVisible()
  })

  test('페이지네이션이 동작한다', async ({ page }) => {
    // 조직 선택
    await page.click('[data-testid=organization-select]')
    await page.click('[data-testid=organization-option]:first-child')
    
    // 페이지 크기를 작게 설정하여 페이지네이션 활성화
    await page.click('[data-testid=page-size-select]')
    await page.click('text=5')
    
    // 페이지네이션이 있는 경우
    const nextButton = page.locator('[data-testid=next-page]')
    if (await nextButton.isVisible()) {
      await nextButton.click()
      
      // 페이지가 변경되었는지 확인
      await expect(page.locator('text=2 / ')).toBeVisible()
      
      // 이전 버튼 테스트
      await page.click('[data-testid=prev-page]')
      await expect(page.locator('text=1 / ')).toBeVisible()
    }
  })

  test('구성원 선택 및 일괄 작업이 동작한다', async ({ page }) => {
    // 조직 선택
    await page.click('[data-testid=organization-select]')
    await page.click('[data-testid=organization-option]:first-child')
    
    // 첫 번째 구성원 체크박스 선택
    await page.click('[data-testid=member-checkbox]:first-child')
    
    // 선택된 개수 표시 확인
    await expect(page.locator('text=1명 선택됨')).toBeVisible()
    
    // 일괄 작업 버튼 표시 확인
    await expect(page.locator('[data-testid=bulk-actions]')).toBeVisible()
    
    // 일괄 작업 메뉴 열기
    await page.click('[data-testid=bulk-actions]')
    
    // 일괄 작업 옵션들 확인
    await expect(page.locator('text=직책 일괄 변경')).toBeVisible()
    await expect(page.locator('text=조직 일괄 이동')).toBeVisible()
    await expect(page.locator('text=일괄 활성화')).toBeVisible()
    await expect(page.locator('text=일괄 비활성화')).toBeVisible()
  })

  test('구성원 편집 다이얼로그가 열린다', async ({ page }) => {
    // 조직 선택
    await page.click('[data-testid=organization-select]')
    await page.click('[data-testid=organization-option]:first-child')
    
    // 첫 번째 구성원의 편집 버튼 클릭
    await page.click('[data-testid=edit-member]:first-child')
    
    // 편집 다이얼로그 확인
    await expect(page.locator('[data-testid=edit-dialog]')).toBeVisible()
    await expect(page.locator('text=구성원 정보 수정')).toBeVisible()
    
    // 다이얼로그 닫기
    await page.click('[data-testid=dialog-close]')
    await expect(page.locator('[data-testid=edit-dialog]')).not.toBeVisible()
  })

  test('가져오기/내보내기 다이얼로그가 열린다', async ({ page }) => {
    // 가져오기/내보내기 버튼 클릭
    await page.click('[data-testid=import-export-button]')
    
    // 다이얼로그 확인
    await expect(page.locator('[data-testid=import-export-dialog]')).toBeVisible()
    await expect(page.locator('text=데이터 가져오기/내보내기')).toBeVisible()
    
    // 탭 확인
    await expect(page.locator('text=가져오기')).toBeVisible()
    await expect(page.locator('text=내보내기')).toBeVisible()
    
    // 내보내기 탭 클릭
    await page.click('text=내보내기')
    
    // 내보내기 옵션들 확인
    await expect(page.locator('text=Excel로 내보내기')).toBeVisible()
    await expect(page.locator('text=PDF 보고서')).toBeVisible()
    await expect(page.locator('text=통계 보고서')).toBeVisible()
    
    // 다이얼로그 닫기
    await page.click('[data-testid=dialog-close]')
    await expect(page.locator('[data-testid=import-export-dialog]')).not.toBeVisible()
  })

  test('필터 초기화가 동작한다', async ({ page }) => {
    // 조직 선택
    await page.click('[data-testid=organization-select]')
    await page.click('[data-testid=organization-option]:first-child')
    
    // 검색어 입력
    await page.fill('[data-testid=search-input]', '테스트검색')
    
    // 직책 필터 설정
    await page.click('[data-testid=role-filter]')
    await page.click('[data-testid=role-option]:first-child')
    
    // 활성 필터가 표시되는지 확인
    await expect(page.locator('[data-testid=active-filters]')).toBeVisible()
    
    // 초기화 버튼 클릭
    await page.click('[data-testid=reset-filters]')
    
    // 필터가 초기화되었는지 확인
    await expect(page.locator('[data-testid=search-input]')).toHaveValue('')
    await expect(page.locator('[data-testid=active-filters]')).not.toBeVisible()
  })

  test('새로고침 기능이 동작한다', async ({ page }) => {
    // 조직 선택
    await page.click('[data-testid=organization-select]')
    await page.click('[data-testid=organization-option]:first-child')
    
    // 새로고침 버튼 클릭
    await page.click('[data-testid=refresh-button]')
    
    // 로딩 상태 확인
    await expect(page.locator('text=구성원 목록을 불러오는 중')).toBeVisible()
    
    // 로딩 완료 대기
    await page.waitForSelector('[data-testid=member-list]', { timeout: 10000 })
  })

  test('모두 선택/해제 기능이 동작한다', async ({ page }) => {
    // 조직 선택
    await page.click('[data-testid=organization-select]')
    await page.click('[data-testid=organization-option]:first-child')
    
    // 헤더의 전체 선택 체크박스 클릭
    await page.click('[data-testid=select-all]')
    
    // 모든 항목이 선택되었는지 확인
    const selectedCount = await page.locator('text=선택됨').textContent()
    expect(selectedCount).toContain('선택됨')
    
    // 다시 클릭하여 모두 해제
    await page.click('[data-testid=select-all]')
    
    // 선택이 해제되었는지 확인
    await expect(page.locator('text=선택됨')).not.toBeVisible()
  })

  test('빈 상태가 올바르게 표시된다', async ({ page }) => {
    // 조직을 선택하지 않은 상태
    await expect(page.locator('text=조직을 선택하세요')).toBeVisible()
    await expect(page.locator('text=구성원을 확인하려면 먼저 조직을 선택해주세요')).toBeVisible()
    
    // 조직 선택 후 구성원이 없는 경우를 시뮬레이션
    // (실제로는 빈 조직을 선택해야 함)
    await page.fill('[data-testid=search-input]', 'nonexistentmember12345')
    
    // 검색 결과가 없는 상태 확인
    await page.waitForTimeout(500) // 디바운싱 대기
    await expect(page.locator('text=검색 조건에 맞는 구성원이 없습니다')).toBeVisible()
  })
})