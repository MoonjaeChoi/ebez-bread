import { test, expect } from '@playwright/test'

test.describe('Account Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/auth/signin')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to accounting page
    await page.goto('/dashboard/accounting/accounts')
  })

  test('should display account tree structure', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check page title
    await expect(page.locator('h1')).toContainText('계정과목 관리')
    
    // Check account tree is visible
    await expect(page.locator('[data-testid="account-tree"]')).toBeVisible()
    
    // Check filter tabs
    await expect(page.locator('button:has-text("전체")')).toBeVisible()
    await expect(page.locator('button:has-text("자산")')).toBeVisible()
    await expect(page.locator('button:has-text("부채")')).toBeVisible()
    await expect(page.locator('button:has-text("자본")')).toBeVisible()
    await expect(page.locator('button:has-text("수익")')).toBeVisible()
    await expect(page.locator('button:has-text("비용")')).toBeVisible()
  })

  test('should create new account successfully', async ({ page }) => {
    // Click add account button
    await page.click('button:has-text("계정 추가")')
    
    // Fill account form
    await page.fill('[name="code"]', '9999')
    await page.fill('[name="name"]', '테스트 계정')
    await page.fill('[name="englishName"]', 'Test Account')
    
    // Select account type
    await page.click('[data-testid="account-type-select"]')
    await page.click('text=자산')
    
    // Check allow transaction checkbox
    await page.check('[name="allowTransaction"]')
    
    // Submit form
    await page.click('button:has-text("생성")')
    
    // Check success message
    await expect(page.locator('text=계정과목이 생성되었습니다')).toBeVisible()
    
    // Verify account appears in tree
    await expect(page.locator('text=9999 테스트 계정')).toBeVisible()
  })

  test('should validate duplicate account codes', async ({ page }) => {
    await page.click('button:has-text("계정 추가")')
    
    // Try to create account with existing code
    await page.fill('[name="code"]', '1000') // Existing code
    await page.fill('[name="name"]', '중복 계정')
    
    // Error should appear
    await expect(page.locator('text=이미 존재하는 계정 코드입니다')).toBeVisible()
    
    // Submit button should be disabled
    await expect(page.locator('button:has-text("생성")')).toBeDisabled()
  })

  test('should expand and collapse account nodes', async ({ page }) => {
    // Find expandable account node
    const expandButton = page.locator('[data-testid="expand-button"]').first()
    
    // Click to expand
    await expandButton.click()
    
    // Check child accounts are visible
    await expect(page.locator('[data-testid="account-child"]')).toBeVisible()
    
    // Click to collapse
    await expandButton.click()
    
    // Check child accounts are hidden
    await expect(page.locator('[data-testid="account-child"]')).toBeHidden()
  })

  test('should filter accounts by type', async ({ page }) => {
    // Click asset filter
    await page.click('button:has-text("자산")')
    
    // Only asset accounts should be visible
    await expect(page.locator('text=자산')).toBeVisible()
    await expect(page.locator('text=부채')).not.toBeVisible()
    
    // Switch to liability filter
    await page.click('button:has-text("부채")')
    
    // Only liability accounts should be visible
    await expect(page.locator('text=부채')).toBeVisible()
    await expect(page.locator('text=자산')).not.toBeVisible()
  })

  test('should edit existing account', async ({ page }) => {
    // Find and click edit button for first account
    await page.hover('[data-testid="account-item"]')
    await page.click('[data-testid="edit-account-button"]')
    
    // Update account name
    await page.fill('[name="name"]', '수정된 계정명')
    
    // Submit changes
    await page.click('button:has-text("수정")')
    
    // Check success message
    await expect(page.locator('text=계정과목이 수정되었습니다')).toBeVisible()
    
    // Verify updated name appears
    await expect(page.locator('text=수정된 계정명')).toBeVisible()
  })

  test('should prevent deletion of system accounts', async ({ page }) => {
    // Try to delete system account
    await page.hover('[data-testid="system-account"]')
    
    // Delete button should not be visible for system accounts
    await expect(page.locator('[data-testid="delete-account-button"]')).not.toBeVisible()
  })

  test('should delete account with confirmation', async ({ page }) => {
    // Create a test account first
    await page.click('button:has-text("계정 추가")')
    await page.fill('[name="code"]', '9998')
    await page.fill('[name="name"]', '삭제할 계정')
    await page.click('button:has-text("생성")')
    
    // Find and hover over the created account
    await page.hover('text=9998 삭제할 계정')
    
    // Click delete button
    await page.click('[data-testid="delete-account-button"]')
    
    // Confirm deletion in dialog
    await page.click('button:has-text("삭제")')
    
    // Check success message
    await expect(page.locator('text=계정과목이 삭제되었습니다')).toBeVisible()
    
    // Verify account is no longer visible
    await expect(page.locator('text=9998 삭제할 계정')).not.toBeVisible()
  })

  test('should show account details in sidebar', async ({ page }) => {
    // Click on an account
    await page.click('[data-testid="account-item"]')
    
    // Check account details panel
    await expect(page.locator('[data-testid="account-details"]')).toBeVisible()
    await expect(page.locator('text=계정 상세 정보')).toBeVisible()
    
    // Should show account properties
    await expect(page.locator('text=계정 코드:')).toBeVisible()
    await expect(page.locator('text=계정 유형:')).toBeVisible()
    await expect(page.locator('text=레벨:')).toBeVisible()
  })

  test('should handle loading states', async ({ page }) => {
    // Intercept API request to delay it
    await page.route('/api/trpc/accountCodes.getAll*', async route => {
      await page.waitForTimeout(2000) // Simulate slow loading
      await route.continue()
    })
    
    await page.goto('/dashboard/accounting/accounts')
    
    // Check loading skeleton is visible
    await expect(page.locator('.animate-pulse')).toBeVisible()
    
    // Wait for data to load
    await page.waitForLoadState('networkidle')
    
    // Loading skeleton should be gone
    await expect(page.locator('.animate-pulse')).not.toBeVisible()
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/trpc/accountCodes.getAll*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    await page.goto('/dashboard/accounting/accounts')
    
    // Should show error message
    await expect(page.locator('text=계정과목을 불러오는 중 오류가 발생했습니다')).toBeVisible()
    
    // Should show retry button
    await expect(page.locator('button:has-text("다시 시도")')).toBeVisible()
  })

  test('should respect user permissions', async ({ page }) => {
    // Mock user with limited permissions
    await page.addInitScript(() => {
      window.sessionStorage.setItem('user-role', 'GENERAL_USER')
    })
    
    await page.goto('/dashboard/accounting/accounts')
    
    // Add account button should not be visible
    await expect(page.locator('button:has-text("계정 추가")')).not.toBeVisible()
    
    // Action buttons should not be visible
    await expect(page.locator('[data-testid="edit-account-button"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="delete-account-button"]')).not.toBeVisible()
  })

  test('should maintain church-only filter state', async ({ page }) => {
    // Enable church-only filter
    await page.check('[data-testid="church-only-toggle"]')
    
    // Navigate away and back
    await page.goto('/dashboard')
    await page.goto('/dashboard/accounting/accounts')
    
    // Filter state should be preserved
    await expect(page.locator('[data-testid="church-only-toggle"]')).toBeChecked()
  })
})