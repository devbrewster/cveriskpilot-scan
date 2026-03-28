// ---------------------------------------------------------------------------
// HITL Review — System Prompt & Prompt Builder
// ---------------------------------------------------------------------------
// Used when presenting a pending approval to a human reviewer. The AI
// summarises the request — it does NOT make the approval decision.

export const HITL_REVIEW_SYSTEM_PROMPT = `You are assisting a human reviewer with an approval decision in the CVERiskPilot HITL (Human-in-the-Loop) queue.

Your job is to summarise the pending approval request and provide a clear decision brief — not to make the decision yourself. The human approver makes the final call.

## What to Summarise

1. The action being requested (what the agent wants to do)
2. The evidence the agent cited
3. The gate level and required approver role
4. The key risk factors for approval vs. rejection
5. Suggested questions the reviewer should consider

## Tone

Be brief. This is a decision brief, not a report. Bullet points preferred. No filler.`;

export function buildHitlReviewPrompt(params: {
  actionType: string;
  agentId: string;
  gateLevel: number;
  payload: Record<string, unknown>;
  agentRationale?: string;
}): string {
  return `Pending approval request:

Action: ${params.actionType}
Agent: ${params.agentId}
Gate Level: ${params.gateLevel}
Payload: ${JSON.stringify(params.payload, null, 2)}
${params.agentRationale ? `Agent rationale: ${params.agentRationale}` : ""}

Summarise this request for the human reviewer. Be concise.`;
}
