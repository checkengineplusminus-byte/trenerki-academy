export type GiftCodePrefix = 'TA' | 'TW';

// Sixteen case-insensitive Crockford Base32 characters carry 80 bits. Legacy
// 32-character hexadecimal codes remain valid and are never silently replaced.
const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const codePattern = /^(TA|TW)-(?:[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{16}|[0-9A-F]{32})$/;

export function normalizeGiftCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  const compact = value.trim().toUpperCase().replace(/\s/g, '');
  const match = /^(TA|TW)-(.*)$/.exec(compact);
  return match ? match[1] + '-' + match[2].replace(/-/g, '') : compact;
}

export function isGiftCode(value: unknown, prefix?: GiftCodePrefix): boolean {
  const code = normalizeGiftCode(value);
  return codePattern.test(code) && (!prefix || code.startsWith(prefix + '-'));
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

export async function giftCodeHash(value: string): Promise<string> {
  const code = normalizeGiftCode(value);
  if (!isGiftCode(code)) throw new Error('invalid_gift_code');
  return Array.from(await digest(code), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function legacyGiftCode(prefix: GiftCodePrefix, id: string): string {
  if (!uuidPattern.test(id)) throw new Error('invalid_gift_id');
  return prefix + '-' + id.replaceAll('-', '').toUpperCase();
}

export async function shortGiftCode(prefix: GiftCodePrefix, id: string): Promise<string> {
  if (!uuidPattern.test(id)) throw new Error('invalid_gift_id');
  // Hashing avoids keeping the fixed version/variant bits of UUIDv4 when the
  // printable value is shortened. A domain prefix fixes this format for retries.
  const bytes = (await digest('TRENERKI-GIFT-V2:' + prefix + ':' + id.toLowerCase())).subarray(0, 10);
  let buffer = 0, bits = 0, encoded = '';
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += alphabet[(buffer >>> bits) & 31];
    }
    buffer &= (1 << bits) - 1;
  }
  return prefix + '-' + encoded;
}

// Reprinting and Stripe retries must use the exact code that was originally
// committed. Older random course codes cannot be recovered from their gift ID.
export async function resolveGiftCode(prefix: GiftCodePrefix, id: string, storedHash: unknown): Promise<string | null> {
  if (!uuidPattern.test(id) || typeof storedHash !== 'string' || !/^[0-9a-f]{64}$/.test(storedHash)) return null;
  const short = await shortGiftCode(prefix, id);
  if (await giftCodeHash(short) === storedHash) return short;
  const legacy = legacyGiftCode(prefix, id);
  return await giftCodeHash(legacy) === storedHash ? legacy : null;
}
