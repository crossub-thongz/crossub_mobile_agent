import type { components, operations } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/** Self-Manage agency inbox (Phase 2 Conversations): `/agent/conversations/*`. */
export type AgentConversationSummary = components['schemas']['AgentConversationSummaryDto'];
export type AgentConversationList = components['schemas']['AgentConversationListDto'];
export type AgentConversationDetail = components['schemas']['AgentConversationDetailDto'];
export type AgentConversationMessage = components['schemas']['AgentConversationMessageDto'];
export type AgentConversationTemplate = components['schemas']['AgentConversationTemplateDto'];
export type AgentConversationReplyResult = components['schemas']['AgentConversationReplyResultDto'];
export type AgentConversationReplyInput = components['schemas']['AgentConversationReplyDto'];
export type AgentConversationAttachmentUpload = components['schemas']['AgentConversationAttachmentUploadDto'];
export type AgentCreateConversationInput = components['schemas']['AgentCreateConversationDto'];
export type AgentConversationStateAction = components['schemas']['AgentConversationStateDto']['action'];
export type AgentConversationJobInput = components['schemas']['AgentConversationJobDto'];
export type AgentConversationWorkflowOption = components['schemas']['WorkflowOptionDto'];
export type AgentConversationWorkflowLink = components['schemas']['ConversationWorkflowLinkResponseDto'];
export type AgentConversationAiDraftInput = components['schemas']['AgentConversationAiDraftRequestDto'];
export type AgentConversationAiDraft = components['schemas']['AgentConversationAiDraftDto'];
export type AgentConversationListQuery = NonNullable<
  operations['AgentConversationController_list']['parameters']['query']
>;
export type AgentConversationListState = NonNullable<AgentConversationListQuery['state']>;

const idPath = (id: string) => ({ path: { id } });

export async function fetchAgentConversations(
  query: AgentConversationListQuery,
): Promise<AgentConversationList> {
  const result = await crossub.GET('/agent/conversations', { params: { query } });
  return unwrapCrossubResult(result, "Couldn't load conversations");
}

export async function fetchAgentConversationTemplates(): Promise<AgentConversationTemplate[]> {
  const result = await crossub.GET('/agent/conversations/templates');
  return unwrapCrossubResult(result, "Couldn't load templates").items;
}

export async function createAgentConversation(
  body: AgentCreateConversationInput,
): Promise<AgentConversationReplyResult> {
  const result = await crossub.POST('/agent/conversations', { body });
  return unwrapCrossubResult(result, "Couldn't start the conversation");
}

/** Opening a thread marks it read. */
export async function fetchAgentConversation(id: string): Promise<AgentConversationDetail> {
  const result = await crossub.GET('/agent/conversations/{id}', { params: idPath(id) });
  return unwrapCrossubResult(result, "Couldn't load the conversation");
}

export async function replyToAgentConversation(
  id: string,
  body: AgentConversationReplyInput,
): Promise<AgentConversationReplyResult> {
  const result = await crossub.POST('/agent/conversations/{id}/reply', {
    params: idPath(id),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't send the reply");
}

export async function setAgentConversationAssignee(
  id: string,
  assignedToId: string | null,
): Promise<AgentConversationDetail> {
  const result = await crossub.PATCH('/agent/conversations/{id}/assignee', {
    params: idPath(id),
    body: { assignedToId },
  });
  return unwrapCrossubResult(result, "Couldn't change the assignee");
}

export async function setAgentConversationState(
  id: string,
  action: AgentConversationStateAction,
): Promise<AgentConversationDetail> {
  const result = await crossub.PATCH('/agent/conversations/{id}/state', {
    params: idPath(id),
    body: { action },
  });
  return unwrapCrossubResult(result, "Couldn't update the conversation");
}

export async function setAgentConversationProperty(
  id: string,
  propertyId: string,
): Promise<AgentConversationDetail> {
  const result = await crossub.PATCH('/agent/conversations/{id}/property', {
    params: idPath(id),
    body: { propertyId },
  });
  return unwrapCrossubResult(result, "Couldn't file the conversation under the property");
}

export async function fetchAgentConversationJobs(
  id: string,
): Promise<AgentConversationWorkflowOption[]> {
  const result = await crossub.GET('/agent/conversations/{id}/jobs', { params: idPath(id) });
  return unwrapCrossubResult(result, "Couldn't load the property's jobs").items;
}

export async function linkAgentConversationJob(
  id: string,
  body: AgentConversationJobInput,
): Promise<AgentConversationWorkflowLink> {
  const result = await crossub.PATCH('/agent/conversations/{id}/job', {
    params: idPath(id),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't link the job");
}

export async function unlinkAgentConversationJob(
  id: string,
): Promise<AgentConversationWorkflowLink> {
  const result = await crossub.DELETE('/agent/conversations/{id}/job', { params: idPath(id) });
  return unwrapCrossubResult(result, "Couldn't unlink the job");
}

/** Nothing is sent or stored; a plain starter comes back when AI is unavailable. */
export async function draftAgentConversationReply(
  id: string,
  body: AgentConversationAiDraftInput,
): Promise<AgentConversationAiDraft> {
  const result = await crossub.POST('/agent/conversations/{id}/ai-draft', {
    params: idPath(id),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't draft a reply");
}
