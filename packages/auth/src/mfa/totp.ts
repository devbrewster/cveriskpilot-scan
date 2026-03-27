// TOTP MFA for CVERiskPilot
// Handles secret generation, QR code URI creation, and token verification

import * as OTPAuth from 'otpauth';

/** TOTP configuration constants */
const TOTP_ISSUER = 'CVERiskPilot';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_WINDOW = 1; // allows +/- 1 period for clock drift

/** Result of generating a new TOTP secret */
export interface TOTPSetupResult {
  /** Base32-encoded secret to store in the database */
  secret: string;
  /** URI for generating a QR code (otpauth:// format) */
  uri: string;
}

/**
 * Generate a new TOTP secret and return the setup data.
 * The secret should be stored encrypted in the user's mfaSecret field.
 * The URI can be rendered as a QR code for the user to scan.
 */
export function generateTOTPSecret(
  userEmail: string,
): TOTPSetupResult {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: userEmail,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: new OTPAuth.Secret(),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Generate the otpauth:// URI for QR code rendering.
 * Use this if you already have a secret and need to regenerate the URI.
 */
export function generateQRCodeUri(
  userEmail: string,
  base32Secret: string,
): string {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: userEmail,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });

  return totp.toString();
}

/**
 * Verify a TOTP token against a stored secret.
 * Returns true if the token is valid within the allowed window.
 */
export function verifyTOTPToken(
  token: string,
  base32Secret: string,
): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });

  // validate() returns the time step difference or null if invalid
  const delta = totp.validate({ token, window: TOTP_WINDOW });
  return delta !== null;
}
