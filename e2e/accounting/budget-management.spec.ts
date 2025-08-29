import { test, expect } from '@playwright/test'

test.describe('Budget Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/auth/signin')
    await page.fill('[name="email"]', 'budget.manager@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to budget overview
    await page.goto('/dashboard/budgets')
  })

  test('should display budget overview dashboard', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    
    // Check main elements
    await expect(page.locator('h2:has-text("예산 현황")')).toBeVisible()
    
    // Check filter options
    await expect(page.locator('[data-testid="year-filter"]')).toBeVisible()
    await expect(page.locator('[data-testid="department-filter"]')).toBeVisible()
    
    // Check statistics cards
    await expect(page.locator('text=전체 예산')).toBeVisible()
    await expect(page.locator('text=활성 예산')).toBeVisible()
    await expect(page.locator('text=총 예산액')).toBeVisible()
    await expect(page.locator('text=평균 집행률')).toBeVisible()
    
    // Check execution rate analysis
    await expect(page.locator('text=예산 집행률 분석')).toBeVisible()
  })

  test('should create new budget successfully', async ({ page }) => {
    // Click create budget button
    await page.click('button:has-text("예산 생성")')
    
    // Fill basic budget info
    await page.fill('[name="name"]', '2024년 테스트 예산')
    await page.fill('[name="description"]', '테스트용 예산입니다')
    
    // Set year
    await page.click('[data-testid="year-select"]')
    await page.click('text=2024년')
    
    // Set date range
    await page.fill('[name="startDate"]', '2024-01-01')
    await page.fill('[name="endDate"]', '2024-12-31')
    
    // Select department
    await page.click('[data-testid="department-select"]')
    await page.click('text=총무부')
    
    // Add budget items
    await page.click('button:has-text("예산 항목 추가")')
    
    // Fill first item
    await page.fill('[name="budgetItems.0.name"]', '사무용품비')
    await page.fill('[name="budgetItems.0.amount"]', '1000000')
    await page.click('[data-testid="category-select-0"]')
    await page.click('text=운영비')
    await page.fill('[name="budgetItems.0.code"]', 'OP001')
    
    // Add second item
    await page.click('button:has-text("예산 항목 추가")')
    await page.fill('[name="budgetItems.1.name"]', '목회활동비')
    await page.fill('[name="budgetItems.1.amount"]', '2000000')
    await page.click('[data-testid="category-select-1"]')
    await page.click('text=사역비')
    await page.fill('[name="budgetItems.1.code"]', 'MIN001')
    
    // Total should be calculated automatically
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('3,000,000')
    
    // Submit form
    await page.click('button:has-text("생성")')
    
    // Check success message
    await expect(page.locator('text=예산이 생성되었습니다')).toBeVisible()
    
    // Should redirect to budget list
    await expect(page.locator('text=2024년 테스트 예산')).toBeVisible()
  })

  test('should validate budget form inputs', async ({ page }) => {
    await page.click('button:has-text("예산 생성")')
    
    // Try to submit without required fields
    await page.click('button:has-text("생성")')
    
    // Should show validation errors
    await expect(page.locator('text=예산명을 입력해주세요')).toBeVisible()
    await expect(page.locator('text=부서를 선택해주세요')).toBeVisible()
    
    // Fill name but leave items empty
    await page.fill('[name="name"]', '테스트')
    await page.click('button:has-text("생성")')
    
    await expect(page.locator('text=최소 1개의 예산 항목이 필요합니다')).toBeVisible()
  })

  test('should handle total amount mismatch', async ({ page }) => {
    await page.click('button:has-text("예산 생성")')
    
    // Fill basic info
    await page.fill('[name="name"]', '불일치 테스트')
    await page.fill('[name="totalAmount"]', '5000000') // Manual total
    
    // Add item with different amount
    await page.click('button:has-text("예산 항목 추가")')
    await page.fill('[name="budgetItems.0.amount"]', '1000000') // Different total
    
    // Should show warning
    await expect(page.locator('text=항목별 합계와 총액이 일치하지 않습니다')).toBeVisible()
    
    // Auto-calculate button should work
    await page.click('button:has-text("자동 계산")')
    await expect(page.locator('[name="totalAmount"]')).toHaveValue('1000000')
  })

  test('should submit budget for approval', async ({ page }) => {
    // Assume budget already exists in DRAFT status
    await page.goto('/dashboard/budgets/budget-1')
    
    // Check current status
    await expect(page.locator('[data-testid="budget-status"]')).toContainText('초안')
    
    // Click submit button
    await page.click('button:has-text("제출")')
    
    // Confirm submission
    await page.click('button:has-text("제출"):last-of-type')
    
    // Status should change
    await expect(page.locator('[data-testid="budget-status"]')).toContainText('제출됨')
    
    // Edit button should be disabled
    await expect(page.locator('button:has-text("수정")')).toBeDisabled()
  })

  test('should approve submitted budget', async ({ page }) => {
    // Mock user with approval permissions
    await page.addInitScript(() => {
      window.sessionStorage.setItem('user-role', 'FINANCIAL_MANAGER')
    })
    
    // Navigate to submitted budget
    await page.goto('/dashboard/budgets/budget-2') // Submitted budget
    
    await expect(page.locator('[data-testid="budget-status"]')).toContainText('제출됨')
    
    // Approve button should be visible
    await page.click('button:has-text("승인")')
    
    // Fill approval comment
    await page.fill('[name="comment"]', '예산이 적절하여 승인합니다')
    
    // Confirm approval
    await page.click('button:has-text("승인"):last-of-type')
    
    // Status should change to approved
    await expect(page.locator('[data-testid="budget-status"]')).toContainText('승인됨')
    
    // Budget should be activated
    await page.click('button:has-text("활성화")')
    await expect(page.locator('[data-testid="budget-status"]')).toContainText('활성')
  })

  test('should check budget balance before expense', async ({ page }) => {
    // Navigate to expense creation with budget integration
    await page.goto('/dashboard/expense-reports/create')
    
    // Select budget item
    await page.click('[data-testid="budget-item-select"]')
    await page.click('text=사무용품비 (총무부)')
    
    // Enter expense amount
    await page.fill('[name="amount"]', '500000')
    
    // Should show budget validation info
    await expect(page.locator('[data-testid="budget-info"]')).toBeVisible()
    await expect(page.locator('text=사용 가능: ₩1,500,000')).toBeVisible()
    await expect(page.locator('text=집행률: 25%')).toBeVisible()
    
    // Should show green indicator for valid amount
    await expect(page.locator('[data-testid="budget-status-indicator"]')).toHaveClass(/bg-green/)
  })

  test('should prevent budget overrun', async ({ page }) => {
    await page.goto('/dashboard/expense-reports/create')
    
    // Select budget item with limited remaining amount
    await page.click('[data-testid="budget-item-select"]')
    await page.click('text=거의 소진된 항목')
    
    // Enter amount exceeding remaining budget
    await page.fill('[name="amount"]', '2000000') // Exceeds remaining amount
    
    // Should show warning
    await expect(page.locator('text=사용 가능한 예산을 초과했습니다')).toBeVisible()
    await expect(page.locator('[data-testid="budget-status-indicator"]')).toHaveClass(/bg-red/)
    
    // Submit button should be disabled or show warning
    await expect(page.locator('button:has-text("제출")')).toBeDisabled()
  })

  test('should filter budgets by year and department', async ({ page }) => {
    await page.goto('/dashboard/budgets')
    
    // Filter by year
    await page.click('[data-testid="year-filter"]')
    await page.click('text=2023년')
    
    // Only 2023 budgets should be visible
    await expect(page.locator('text=2023년')).toBeVisible()
    await expect(page.locator('text=2024년')).not.toBeVisible()
    
    // Filter by department
    await page.click('[data-testid="department-filter"]')
    await page.click('text=총무부')
    
    // Only 총무부 budgets should be visible
    await expect(page.locator('text=총무부')).toBeVisible()
    await expect(page.locator('text=선교부')).not.toBeVisible()
  })

  test('should show budget execution progress', async ({ page }) => {
    await page.goto('/dashboard/budgets/active-budget-1')
    
    // Should show execution progress for each item
    await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible()
    
    // Progress bars should be visible
    const progressBars = page.locator('[role="progressbar"]')
    await expect(progressBars).toHaveCount(3) // Assuming 3 budget items
    
    // Should show execution statistics
    await expect(page.locator('text=집행률:')).toBeVisible()
    await expect(page.locator('text=사용액:')).toBeVisible()
    await expect(page.locator('text=잔여액:')).toBeVisible()
  })

  test('should handle budget modifications', async ({ page }) => {
    await page.goto('/dashboard/budgets/active-budget-1')
    
    // Click modify budget button
    await page.click('button:has-text("예산 변경")')
    
    // Select modification type
    await page.click('[data-testid="change-type-select"]')
    await page.click('text=항목 추가')
    
    // Fill modification details
    await page.fill('[name="reason"]', '추가 사무용품 구매 필요')
    await page.fill('[name="requestedAmount"]', '500000')
    
    // Submit modification request
    await page.click('button:has-text("변경 요청")')
    
    // Should show in change history
    await expect(page.locator('text=변경 이력')).toBeVisible()
    await expect(page.locator('text=항목 추가')).toBeVisible()
    await expect(page.locator('text=검토 중')).toBeVisible()
  })

  test('should export budget reports', async ({ page }) => {
    await page.goto('/dashboard/budgets')
    
    // Click export button
    await page.click('button:has-text("내보내기")')
    
    // Select export format
    await page.click('text=Excel')
    
    // Select date range
    await page.fill('[name="startDate"]', '2024-01-01')
    await page.fill('[name="endDate"]', '2024-12-31')
    
    // Start download
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("다운로드")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('budget-report')
    expect(download.suggestedFilename()).toContain('.xlsx')
  })

  test('should handle budget archival', async ({ page }) => {
    await page.goto('/dashboard/budgets/completed-budget-1')
    
    // Close completed budget
    await page.click('button:has-text("예산 마감")')
    
    // Confirm closure
    await page.fill('[name="closeReason"]', '2024년 예산 완료')
    await page.click('button:has-text("마감")')
    
    // Status should change to closed
    await expect(page.locator('[data-testid="budget-status"]')).toContainText('마감')
    
    // Should no longer appear in active budgets
    await page.goto('/dashboard/budgets')
    await expect(page.locator('text=completed-budget-1')).not.toBeVisible()
    
    // Should appear in archived budgets
    await page.click('text=마감된 예산')
    await expect(page.locator('text=completed-budget-1')).toBeVisible()
  })
})