import { router } from '@/lib/trpc/server'
import { membersRouter } from './members'
import { offeringsRouter } from './offerings'
import { attendanceRouter } from './attendance'
import { visitationsRouter } from './visitations'
import { expenseReportsRouter } from './expense-reports'
import { reportsRouter } from './reports'
import { notificationsRouter } from './notifications'
import { importExportRouter } from './import-export'
import { dataManagementRouter } from './data-management'
import { adminRouter } from './admin'
import { accountCodesRouter } from './account-codes'
import { budgetsRouter } from './budgets'
import { transactionsRouter } from './transactions'

export const appRouter = router({
  members: membersRouter,
  offerings: offeringsRouter,
  attendance: attendanceRouter,
  visitations: visitationsRouter,
  expenseReports: expenseReportsRouter,
  reports: reportsRouter,
  notifications: notificationsRouter,
  importExport: importExportRouter,
  dataManagement: dataManagementRouter,
  admin: adminRouter,
  accountCodes: accountCodesRouter,
  budgets: budgetsRouter,
  transactions: transactionsRouter,
})

export type AppRouter = typeof appRouter