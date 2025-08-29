/**
 * Business logic event logging utilities
 * These functions provide consistent logging for business events in the church management system
 */

import { logger, LogContext } from './index'

// Business event types
export type BusinessEvent = 
  // Member events
  | 'member_created' | 'member_updated' | 'member_deleted' | 'member_activated' | 'member_deactivated'
  // Offering events  
  | 'offering_recorded' | 'offering_updated' | 'offering_deleted'
  // Attendance events
  | 'attendance_recorded' | 'attendance_updated' | 'attendance_bulk_import'
  // Visitation events
  | 'visitation_created' | 'visitation_updated' | 'visitation_completed'
  // Expense report events
  | 'expense_report_created' | 'expense_report_updated' | 'expense_report_submitted' | 'expense_report_approved' | 'expense_report_rejected' | 'expense_report_paid'
  // System events
  | 'data_imported' | 'data_exported' | 'backup_created' | 'system_maintenance'

// Business operation result
export interface BusinessOperationResult {
  success: boolean
  resourceId?: string
  error?: Error
  metadata?: Record<string, any>
}

// Log business events with consistent structure
export const logBusinessEvent = (
  event: BusinessEvent,
  churchId: string,
  userId: string,
  result: BusinessOperationResult,
  additionalContext?: Partial<LogContext>
) => {
  const context: LogContext = {
    churchId,
    userId,
    action: event,
    resourceId: result.resourceId,
    ...additionalContext,
    metadata: {
      ...result.metadata,
      ...additionalContext?.metadata
    }
  }

  if (result.success) {
    logger.business(event, context)
    
    // Also create audit trail for sensitive operations
    const sensitiveEvents: BusinessEvent[] = [
      'member_deleted',
      'expense_report_approved',
      'expense_report_rejected',
      'expense_report_paid',
      'data_exported',
      'system_maintenance'
    ]
    
    if (sensitiveEvents.includes(event)) {
      logger.audit({
        churchId,
        userId,
        action: event,
        resourceType: getResourceType(event),
        resourceId: result.resourceId,
        success: true,
        details: result.metadata
      })
    }
  } else {
    logger.error(`Business operation failed: ${event}`, result.error, context)
    
    // Always audit failed sensitive operations
    const sensitiveEvents: BusinessEvent[] = [
      'expense_report_approved',
      'expense_report_rejected',
      'data_imported',
      'data_exported'
    ]
    
    if (sensitiveEvents.includes(event)) {
      logger.audit({
        churchId,
        userId,
        action: event,
        resourceType: getResourceType(event),
        resourceId: result.resourceId,
        success: false,
        details: {
          error: result.error?.message,
          ...result.metadata
        }
      })
    }
  }
}

// Helper function to determine resource type from event
const getResourceType = (event: BusinessEvent): string => {
  if (event.startsWith('member_')) return 'member'
  if (event.startsWith('offering_')) return 'offering'
  if (event.startsWith('attendance_')) return 'attendance'
  if (event.startsWith('visitation_')) return 'visitation'
  if (event.startsWith('expense_report_')) return 'expense_report'
  if (event.startsWith('data_')) return 'data'
  return 'system'
}

// Specific business operation loggers
export const businessLoggers = {
  // Member operations
  memberCreated: (churchId: string, userId: string, memberId: string, memberData: any) => {
    logBusinessEvent('member_created', churchId, userId, {
      success: true,
      resourceId: memberId,
      metadata: {
        memberName: memberData.name,
        memberEmail: memberData.email,
        memberPhone: memberData.phone
      }
    })
  },

  memberUpdated: (churchId: string, userId: string, memberId: string, changes: any) => {
    logBusinessEvent('member_updated', churchId, userId, {
      success: true,
      resourceId: memberId,
      metadata: {
        changedFields: Object.keys(changes),
        changeCount: Object.keys(changes).length
      }
    })
  },

  memberDeleted: (churchId: string, userId: string, memberId: string, memberName: string) => {
    logBusinessEvent('member_deleted', churchId, userId, {
      success: true,
      resourceId: memberId,
      metadata: {
        memberName,
        deletedBy: userId
      }
    })
  },

  // Expense report operations
  expenseReportCreated: (churchId: string, userId: string, reportId: string, amount: number, category: string) => {
    logBusinessEvent('expense_report_created', churchId, userId, {
      success: true,
      resourceId: reportId,
      metadata: {
        amount,
        category,
        status: 'PENDING'
      }
    })
  },

  expenseReportApproved: (churchId: string, approverId: string, reportId: string, amount: number, requesterId: string) => {
    logBusinessEvent('expense_report_approved', churchId, approverId, {
      success: true,
      resourceId: reportId,
      metadata: {
        amount,
        requesterId,
        approvedBy: approverId,
        approvedAt: new Date().toISOString()
      }
    })
  },

  expenseReportRejected: (churchId: string, approverId: string, reportId: string, reason: string, requesterId: string) => {
    logBusinessEvent('expense_report_rejected', churchId, approverId, {
      success: true,
      resourceId: reportId,
      metadata: {
        requesterId,
        rejectedBy: approverId,
        rejectionReason: reason,
        rejectedAt: new Date().toISOString()
      }
    })
  },

  // Offering operations
  offeringRecorded: (churchId: string, userId: string, offeringId: string, amount: number, type: string) => {
    logBusinessEvent('offering_recorded', churchId, userId, {
      success: true,
      resourceId: offeringId,
      metadata: {
        amount,
        type,
        recordedAt: new Date().toISOString()
      }
    })
  },

  // Data operations
  dataImported: (churchId: string, userId: string, importType: string, recordCount: number, fileName?: string) => {
    logBusinessEvent('data_imported', churchId, userId, {
      success: true,
      metadata: {
        importType,
        recordCount,
        fileName,
        importedAt: new Date().toISOString()
      }
    })
  },

  dataExported: (churchId: string, userId: string, exportType: string, recordCount: number, fileName?: string) => {
    logBusinessEvent('data_exported', churchId, userId, {
      success: true,
      metadata: {
        exportType,
        recordCount,
        fileName,
        exportedAt: new Date().toISOString()
      }
    })
  }
}