'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import { Loader2, Mail, MessageSquare, Bell, Monitor } from 'lucide-react'

const settingsSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  birthdayNotifications: z.boolean(),
  visitationReminders: z.boolean(),
  expenseApprovalNotifications: z.boolean(),
  systemNotifications: z.boolean(),
  birthdayReminderDays: z.number().min(1).max(30),
  visitationReminderHours: z.number().min(1).max(168),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export function NotificationSettingsForm() {
  const [isLoading, setIsLoading] = useState(false)

  const { data: settings, refetch } = trpc.notifications.getSettings.useQuery()
  const updateSettings = trpc.notifications.updateSettings.useMutation()

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: settings ? {
      emailEnabled: settings.emailEnabled,
      smsEnabled: settings.smsEnabled,
      pushEnabled: settings.pushEnabled,
      inAppEnabled: settings.inAppEnabled,
      birthdayNotifications: settings.birthdayNotifications,
      visitationReminders: settings.visitationReminders,
      expenseApprovalNotifications: settings.expenseApprovalNotifications,
      systemNotifications: settings.systemNotifications,
      birthdayReminderDays: settings.birthdayReminderDays,
      visitationReminderHours: settings.visitationReminderHours,
    } : undefined,
  })

  const onSubmit = async (data: SettingsFormData) => {
    setIsLoading(true)
    try {
      await updateSettings.mutateAsync(data)
      await refetch()
      toast.success('알림 설정이 저장되었습니다')
    } catch (error) {
      console.error('Failed to update settings:', error)
      toast.error('설정 저장에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 알림 채널 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              알림 채널
            </CardTitle>
            <CardDescription>
              받고 싶은 알림 채널을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="emailEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      이메일 알림
                    </FormLabel>
                    <FormDescription>
                      이메일로 알림을 받습니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="smsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS 알림
                    </FormLabel>
                    <FormDescription>
                      문자메시지로 알림을 받습니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inAppEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      인앱 알림
                    </FormLabel>
                    <FormDescription>
                      시스템 내에서 알림을 받습니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 알림 유형 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>알림 유형</CardTitle>
            <CardDescription>
              받고 싶은 알림 유형을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="birthdayNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>생일 축하 알림</FormLabel>
                    <FormDescription>
                      교인들의 생일을 미리 알려드립니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visitationReminders"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>심방 알림</FormLabel>
                    <FormDescription>
                      심방 일정을 미리 알려드립니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expenseApprovalNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>지출결의서 알림</FormLabel>
                    <FormDescription>
                      지출결의서 승인 및 결과를 알려드립니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>시스템 알림</FormLabel>
                    <FormDescription>
                      시스템 공지사항 및 업데이트를 알려드립니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 세부 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>세부 설정</CardTitle>
            <CardDescription>
              알림 시간을 조정할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="birthdayReminderDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>생일 알림 시기</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        className="w-20"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                      <span>일 전에 알림</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    생일 몇 일 전에 알림을 받을지 설정합니다 (1-30일)
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visitationReminderHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>심방 알림 시기</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        className="w-20"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                      <span>시간 전에 알림</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    심방 몇 시간 전에 알림을 받을지 설정합니다 (1-168시간)
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : (
            '설정 저장'
          )}
        </Button>
      </form>
    </Form>
  )
}