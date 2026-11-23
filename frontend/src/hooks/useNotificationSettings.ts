import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '@/api/notifications'
import { tripKeys } from '@/hooks/useTrips'
import type { NotificationPrefsRequest, NotificationSettingsResponse } from '@/types/notification'

export const notificationKeys = {
  settings: ['notification-settings'] as const,
  /** Nằm dưới detail(tripId) như các query con khác của chuyến */
  tripMute: (tripId: number) => [...tripKeys.detail(tripId), 'notification-mute'] as const,
}

/** Tuỳ chọn email của chính mình: chỉ đổi khi mình bấm → không cần poll. */
export function useNotificationSettings(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.settings,
    queryFn: notificationApi.settings,
    enabled,
    refetchInterval: false,
  })
}

/** Mutation trả về settings mới → ghi thẳng vào cache. */
function useSettingsMutation<TVariables>(mutationFn: (vars: TVariables) => Promise<NotificationSettingsResponse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (settings) => queryClient.setQueryData(notificationKeys.settings, settings),
  })
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NotificationPrefsRequest) => notificationApi.updatePrefs(body),
    // Bật/tắt công tắc phản hồi ngay; lỗi thì trả lại như cũ
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.settings })
      const previous = queryClient.getQueryData<NotificationSettingsResponse>(notificationKeys.settings)
      if (previous) queryClient.setQueryData(notificationKeys.settings, { ...previous, ...body })
      return { previous }
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(notificationKeys.settings, context.previous)
    },
    onSuccess: (settings) => queryClient.setQueryData(notificationKeys.settings, settings),
  })
}

export function useRequestNotifyEmail() {
  return useSettingsMutation((email: string) => notificationApi.requestEmail({ email }))
}

export function useRemoveNotifyEmail() {
  return useSettingsMutation(() => notificationApi.removeEmail())
}

export function useSendTestEmail() {
  return useMutation({ mutationFn: () => notificationApi.sendTest() })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => notificationApi.verifyEmail({ token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.settings }),
  })
}

export function useUnsubscribe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => notificationApi.unsubscribe({ token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.settings }),
  })
}

/** Mình đã tắt email của chuyến này chưa. Chỉ đổi khi mình bấm → không poll. */
export function useTripMute(tripId: number) {
  return useQuery({
    queryKey: notificationKeys.tripMute(tripId),
    queryFn: () => notificationApi.tripMute(tripId),
    refetchInterval: false,
  })
}

export function useSetTripMute(tripId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (muted: boolean) => notificationApi.setTripMute(tripId, { muted }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.tripMute(tripId) })
    },
    onSuccess: (result) => queryClient.setQueryData(notificationKeys.tripMute(tripId), result),
  })
}
