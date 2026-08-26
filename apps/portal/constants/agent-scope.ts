/**
 * Keys for "which agent's book does this row belong to".
 *
 * Local rows (an offline-queued property, a locally-composed thread) are stamped with the
 * signed-in agent's user id so a second login on the same device cannot see the first one's
 * queue. The values below are the two exceptions to that.
 */

/**
 * Stamped before the real user id was used. Every row the app ever queued locally carries one
 * of these — they were derived from whether the login email contained "agent2", so in
 * production every real agent resolved to `agent-1` and they separate nothing.
 *
 * They stay recognised because dropping them would hide an offline-queued property from the
 * agent who queued it. Nothing writes them any more; the set decays as those rows sync.
 */
export const LEGACY_AGENT_PORTFOLIO_IDS: readonly string[] = ['agent-1', 'agent-2'];

/**
 * No signed-in user to attribute a row to — a signed-out render, or the moment before the
 * session resolves. Scoping is skipped rather than applied against this, so a transient null
 * user cannot blank the list.
 */
export const UNKNOWN_AGENT_PORTFOLIO_ID = 'agent:unknown';
