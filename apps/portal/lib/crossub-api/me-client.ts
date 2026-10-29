import { crossub } from './client';

/**
 * The signed-in user's own device registration, over the typed mobile contract: the key a
 * browser subscribes to push alerts with, and registering or removing this phone's subscription.
 */

/** The server's web push key, or null when the server has no push keys. */
export async function getWebPushKey(): Promise<string | null> {
  const { data, error } = await crossub.GET('/me/web-push-key');
  if (error || !data) throw new Error('Push alerts could not be checked');
  return data.publicKey;
}

/** Register this browser's push subscription (its JSON) as a WEB device token. */
export async function registerWebPushSubscription(subscriptionJson: string): Promise<void> {
  const { error } = await crossub.POST('/me/device-tokens', {
    body: { token: subscriptionJson, platform: 'WEB' },
  });
  if (error) throw new Error('This phone could not be registered for alerts');
}

/** Stop alerts to this browser. */
export async function unregisterWebPushSubscription(subscriptionJson: string): Promise<void> {
  const { error } = await crossub.DELETE('/me/device-tokens', { body: { token: subscriptionJson } });
  if (error) throw new Error('Alerts could not be turned off for this phone');
}
