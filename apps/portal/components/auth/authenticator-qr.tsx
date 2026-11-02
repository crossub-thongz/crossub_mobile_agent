import { authenticatorQr } from '@/lib/authenticator-qr';

/** Scannable code for the setup URL already returned by POST /auth/mfa/setup. */
export function AuthenticatorQr({ value }: { value: string }) {
  const { size, path } = authenticatorQr(value);
  return (
    <svg
      role="img"
      aria-label="Authenticator setup code"
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto size-48 rounded-xl bg-white"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#0D1836" />
    </svg>
  );
}
