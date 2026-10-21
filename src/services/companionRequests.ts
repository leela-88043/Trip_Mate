import { supabase } from './supabase';

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled';

export type CompanionRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: RequestStatus;
  created_at: string;
};

const requestColumns =
  'id, sender_id, receiver_id, status, created_at';

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('Please log in to manage companion requests.');
  }

  return user.id;
}

export async function sendCompanionRequest(
  receiverId: string
): Promise<CompanionRequest> {
  const userId = await getCurrentUserId();

  if (receiverId === userId) {
    throw new Error('You cannot send a request to yourself.');
  }

  const { data, error } = await supabase
    .from('companion_requests')
    .insert({
      sender_id: userId,
      receiver_id: receiverId,
      status: 'pending',
    })
    .select(requestColumns)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'A pending request or accepted connection already exists. Refresh your requests.'
      );
    }

    throw new Error(error.message);
  }

  return data as CompanionRequest;
}

export async function loadCompanionRequests(): Promise<{
  userId: string;
  requests: CompanionRequest[];
}> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('companion_requests')
    .select(requestColumns)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    userId,
    requests: (data ?? []) as CompanionRequest[],
  };
}

async function changeRequestStatus(
  requestId: string,
  status: 'accepted' | 'declined' | 'cancelled'
): Promise<CompanionRequest> {
  const userId = await getCurrentUserId();

  const participantColumn =
    status === 'cancelled' ? 'sender_id' : 'receiver_id';

  const { data, error } = await supabase
    .from('companion_requests')
    .update({ status })
    .eq('id', requestId)
    .eq('status', 'pending')
    .eq(participantColumn, userId)
    .select(requestColumns)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      'This request is no longer pending or you cannot change it. Refresh your requests.'
    );
  }

  return data as CompanionRequest;
}

export function acceptCompanionRequest(requestId: string) {
  return changeRequestStatus(requestId, 'accepted');
}

export function declineCompanionRequest(requestId: string) {
  return changeRequestStatus(requestId, 'declined');
}

export function cancelCompanionRequest(requestId: string) {
  return changeRequestStatus(requestId, 'cancelled');
}