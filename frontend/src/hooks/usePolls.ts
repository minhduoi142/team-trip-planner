import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pollApi } from '@/api/poll'
import type { ClosePollRequest, CreatePollRequest, PollListResponse, PollOptionRequest } from '@/types/poll'
import { tripKeys } from './useTrips'

export function usePolls(tripId: number) {
  return useQuery({ queryKey: tripKeys.polls(tripId), queryFn: () => pollApi.list(tripId) })
}

function usePollMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<PollListResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => qc.setQueryData(tripKeys.polls(tripId), data),
  })
}

export function useCreatePoll(tripId: number) {
  return usePollMutation(tripId, (body: CreatePollRequest) => pollApi.create(tripId, body))
}

export function useDeletePoll(tripId: number) {
  return usePollMutation(tripId, (pollId: number) => pollApi.remove(pollId))
}

export function useAddPollOption(tripId: number) {
  return usePollMutation(tripId, ({ pollId, body }: { pollId: number; body: PollOptionRequest }) =>
    pollApi.addOption(pollId, body),
  )
}

export function useDeletePollOption(tripId: number) {
  return usePollMutation(tripId, (optionId: number) => pollApi.removeOption(optionId))
}

export function useReopenPoll(tripId: number) {
  return usePollMutation(tripId, (pollId: number) => pollApi.reopen(pollId))
}

/** Chốt có thể thêm hoạt động vào lịch trình → làm mới lịch trình. */
export function useClosePoll(tripId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pollId, body }: { pollId: number; body: ClosePollRequest }) => pollApi.close(pollId, body),
    onSuccess: (data, { body }) => {
      qc.setQueryData(tripKeys.polls(tripId), data)
      if (body.addToItinerary) return qc.invalidateQueries({ queryKey: tripKeys.itinerary(tripId) })
    },
  })
}

/** Vote / bỏ vote: đổi ngay trên UI (optimistic), lỗi thì trả lại. */
export function useToggleVote(tripId: number, myUserId: number) {
  const qc = useQueryClient()
  const key = tripKeys.polls(tripId)
  return useMutation({
    mutationFn: ({ optionId, vote }: { optionId: number; vote: boolean }) =>
      vote ? pollApi.vote(optionId) : pollApi.unvote(optionId),
    onMutate: async ({ optionId, vote }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<PollListResponse>(key)
      if (previous) {
        qc.setQueryData<PollListResponse>(key, {
          polls: previous.polls.map((poll) => ({
            ...poll,
            options: poll.options.map((o) => {
              if (o.id !== optionId || o.votedByMe === vote) return o
              const voterIds = vote ? [...o.voterIds, myUserId] : o.voterIds.filter((id) => id !== myUserId)
              return { ...o, votedByMe: vote, voterIds, voteCount: voterIds.length }
            }),
          })),
        })
      }
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSuccess: (data) => qc.setQueryData(key, data),
  })
}
