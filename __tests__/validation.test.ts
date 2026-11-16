import {
  PASSWORD_HINT,
  normalizeEmail,
  validateCode,
  validateEmail,
  validateNewPassword,
} from '../src/utils/validation';

describe('validateNewPassword (mirrors the Cognito pool policy)', () => {
  it.each(['Abcdef12', 'Passw0rdLonger', 'Zz9zzzzz!'])('accepts %s', (pw) => {
    expect(validateNewPassword(pw)).toBeUndefined();
  });

  it.each([
    ['too short', 'Abc1def'],
    ['no upper case letter', 'abcdefg1'],
    ['no lower case letter', 'ABCDEFG1'],
    ['no number', 'Abcdefgh'],
  ])('rejects a password with %s', (_why, pw) => {
    expect(validateNewPassword(pw)).toBe(PASSWORD_HINT);
  });

  it('rejects an empty password', () => {
    expect(validateNewPassword('')).toBe('Password is required');
  });

  it('rejects leading or trailing spaces, which Cognito refuses', () => {
    expect(validateNewPassword(' Abcdef12')).toMatch(/space/);
    expect(validateNewPassword('Abcdef12 ')).toMatch(/space/);
  });
});

describe('validateEmail', () => {
  it('accepts a normal address', () => expect(validateEmail('a@b.co')).toBeUndefined());
  it('rejects empty and malformed addresses', () => {
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail('not-an-email')).toBe('Enter a valid email');
  });
});

describe('validateCode', () => {
  it('accepts exactly six digits', () => expect(validateCode('123456')).toBeUndefined());
  it('rejects anything else', () => {
    expect(validateCode('')).toBeDefined();
    expect(validateCode('12345')).toBeDefined();
    expect(validateCode('12345a')).toBeDefined();
  });
});

it('normalizeEmail trims and lower-cases, as Cognito treats emails case-insensitively', () => {
  expect(normalizeEmail('  Person@Example.COM ')).toBe('person@example.com');
});
