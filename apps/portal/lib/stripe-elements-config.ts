import type { Appearance } from '@stripe/stripe-js';
import type { StripePaymentElementOptions } from '@stripe/stripe-js';

/** Shared Stripe Elements styling for Bill page dialogs. */
export function getStripeBillingAppearance(): Appearance {
  return {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0d9488',
      colorBackground: '#ffffff',
      colorText: '#0f172a',
      colorDanger: '#dc2626',
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSizeBase: '16px',
      spacingUnit: '5px',
      borderRadius: '10px',
    },
    rules: {
      '.Input': {
        padding: '12px 14px',
        boxShadow: 'none',
      },
      '.Label': {
        fontWeight: '500',
        marginBottom: '8px',
      },
      '.Tab': {
        padding: '10px 14px',
      },
      '.Block': {
        marginBottom: '16px',
      },
    },
  };
}

/** Card-only checkout tuned for AU platform billing (no wallets / extra tabs). */
export const STRIPE_BILLING_PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  layout: {
    type: 'accordion',
    defaultCollapsed: false,
    radios: false,
    spacedAccordionItems: true,
  },
  wallets: {
    applePay: 'never',
    googlePay: 'never',
  },
  fields: {
    billingDetails: {
      address: {
        country: 'never',
      },
    },
  },
};
