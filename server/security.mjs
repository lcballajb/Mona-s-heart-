import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const PUBLIC_ROLES = new Set(['patient', 'survivor', 'caregiver']);
export const PRIVILEGED_ROLES = new Set([
  'peer_mentor', 'moderator', 'hospital_coordinator', 'clinic_coordinator',
  'content_reviewer', 'pharmacist_reviewer', 'medical_reviewer', 'privacy_reviewer',
  'security_reviewer', 'administrator',
]);
export const ALL_ROLES = new Set([...PUBLIC_ROLES, ...PRIVILEGED_ROLES]);

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
    throw new Error('Password must be between 12 and 200 characters');
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString('base64url')}$${Buffer.from(key).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, cost, saltText, keyText] = String(encoded).split('$');
  if (algorithm !== 'scrypt' || cost !== '16384' || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, 'base64url');
  const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(expected, Buffer.from(actual));
}

export function opaqueToken() { return randomBytes(32).toString('base64url'); }
export function tokenDigest(token) { return createHash('sha256').update(token).digest('hex'); }
export function safeLogId(value, key = '') {
  return createHash('sha256').update(`${key}:${value}`).digest('hex').slice(0, 16);
}

export function canViewHealth({ actor, ownerId, visibility, connected = false, matchedMentor = false, authorizedOrganization = false }) {
  if (!actor) return false;
  if (actor.id === ownerId) return visibility !== 'explicitly_hidden';
  if (visibility === 'approved_connections') return connected;
  if (visibility === 'matched_mentors') return matchedMentor;
  if (visibility === 'authorized_organization') return authorizedOrganization;
  return false;
}

export function requireAnyRole(actor, roles) {
  if (!actor || !roles.some((role) => actor.roles.includes(role))) {
    const error = new Error('Forbidden'); error.statusCode = 403; throw error;
  }
}
