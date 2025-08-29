// Bull Board queue dashboard API route
import { NextRequest, NextResponse } from 'next/server'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
// import { ExpressAdapter } from '@bull-board/express' // Not needed for API route
import { bullNotificationQueue } from '@/lib/notifications/bullQueue'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Only allow access in development or for super admins
async function hasAccess(): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  try {
    const session = await getServerSession(authOptions)
    return session?.user?.role === 'SUPER_ADMIN'
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const access = await hasAccess()
    if (!access) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    // Get queue statistics
    const stats = await bullNotificationQueue.getQueueStats()

    return NextResponse.json({
      stats,
      queues: bullNotificationQueue.getQueues().map((queue: any) => ({
        name: queue.name,
        opts: queue.opts,
      })),
      dashboardUrl: '/api/admin/queue-dashboard/ui',
    })
  } catch (error) {
    console.error('Queue dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Handle Bull Board UI requests
export async function POST(request: NextRequest) {
  try {
    const access = await hasAccess()
    if (!access) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, queueName, jobId } = body

    // Handle queue actions
    switch (action) {
      case 'pause':
        await bullNotificationQueue.pause()
        return NextResponse.json({ success: true })
        
      case 'resume':
        await bullNotificationQueue.resume()
        return NextResponse.json({ success: true })
        
      case 'clean':
        // Clean completed and failed jobs
        const queues = bullNotificationQueue.getQueues()
        await Promise.all(queues.map(async (queue: any) => {
          await queue.clean(24 * 60 * 60 * 1000, 100) // Clean jobs older than 24 hours, keep 100
        }))
        return NextResponse.json({ success: true })
        
      default:
        return NextResponse.json(
          { error: 'Unknown action' }, 
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Queue action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}