/**
 * Input checks shared by the sign-up, verification and password-reset screens.
 * The password rules mirror the Cognito user pool policy (hetu-terraform/cognito_app.tf):
 * at least 8 characters with a lower case letter, an upper case letter and a number.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HINT = 'At least 8 characters, with upper and lower case letters and a number.';
export const CODE_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email';
  return undefined;
}

/** For choosing a password (sign-up, reset). Sign-in only checks that one was entered. */
export function validateNewPassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password !== password.trim()) return 'Password cannot start or end with a space';
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return PASSWORD_HINT;
  }
  return undefined;
}

export function validateCode(code: string): string | undefined {
  if (!code.trim()) return 'Enter the code from your email';
  if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code.trim())) return `The code is ${CODE_LENGTH} digits`;
  return undefined;
}
