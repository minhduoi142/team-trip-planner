import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { proposalApi } from '@/api/proposal'
import type { ProposalListResponse, ProposalRequest, ScheduleProposalRequest } from '@/types/proposal'
import { tripKeys } from './useTrips'

export function useProposals(tripId: number) {
  return useQuery({ queryKey: tripKeys.proposals(tripId), queryFn: () => proposalApi.list(tripId) })
}

/** Mutation trả về toàn bộ wishlist → ghi thẳng vào cache (huỷ lượt poll đang chạy để không bị ghi đè). */
function useProposalMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<ProposalListResponse>) {
  const qc = useQueryClient()
  const key = tripKeys.proposals(tripId)
  return useMutation({
    mutationFn: fn,
    onMutate: () => qc.cancelQueries({ queryKey: key }),
    onSuccess: (data) => qc.setQueryData(key, data),
  })
}

export function useCreateProposal(tripId: number) {
  return useProposalMutation(tripId, (body: ProposalRequest) => proposalApi.create(tripId, body))
}

export function useUpdateProposal(tripId: number) {
  return useProposalMutation(tripId, ({ proposalId, body }: { proposalId: number; body: ProposalRequest }) =>
    proposalApi.update(proposalId, body),
  )
}

export function useDeleteProposal(tripId: number) {
  return useProposalMutation(tripId, (proposalId: number) => proposalApi.remove(proposalId))
}

/** Đưa vào lịch trình: tạo hoạt động mới → làm mới lịch trình. */
export function useScheduleProposal(tripId: number) {
  const qc = useQueryClient()
  const key = tripKeys.proposals(tripId)
  return useMutation({
    mutationFn: ({ proposalId, body }: { proposalId: number; body: ScheduleProposalRequest }) =>
      proposalApi.schedule(proposalId, body),
    onMutate: () => qc.cancelQueries({ queryKey: key }),
    onSuccess: (data) => {
      qc.setQueryData(key, data)
      return qc.invalidateQueries({ queryKey: tripKeys.itinerary(tripId) })
    },
  })
}

/** Thả tim / bỏ tim: đổi ngay trên UI (optimistic, GIỮ nguyên thứ tự), lỗi thì trả lại. */
export function useToggleProposalVote(tripId: number, myUserId: number) {
  const qc = useQueryClient()
  const key = tripKeys.proposals(tripId)
  return useMutation({
    mutationFn: ({ proposalId, vote }: { proposalId: number; vote: boolean }) =>
      vote ? proposalApi.vote(proposalId) : proposalApi.unvote(proposalId),
    onMutate: async ({ proposalId, vote }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<ProposalListResponse>(key)
      if (previous) {
        qc.setQueryData<ProposalListResponse>(key, {
          ...previous,
          proposals: previous.proposals.map((p) => {
            if (p.id !== proposalId || p.votedByMe === vote) return p
            const voterIds = vote ? [...p.voterIds, myUserId] : p.voterIds.filter((id) => id !== myUserId)
            return { ...p, votedByMe: vote, voterIds, voteCount: voterIds.length }
          }),
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
