import crypto from 'crypto';

/**
 * AU Bank / CCAvenue Standard Fixed IV
 */
const AU_FIXED_IV = Buffer.from([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
]);

/**
 * Derive encryption key from AU Bank working key using MD5
 */
export function deriveKey(workingKey) {
  if (!workingKey) return null;
  return crypto.createHash('md5').update(String(workingKey).trim()).digest();
}

/**
 * Encrypt plaintext string using AES-128-CBC matching AU Bank Integration Kit
 */
export function encryptAuBank(plainText, workingKey) {
  if (!plainText || !workingKey) {
    throw new Error('Plaintext and workingKey are required for AU Bank encryption');
  }
  const key = deriveKey(workingKey);
  const cipher = crypto.createCipheriv('aes-128-cbc', key, AU_FIXED_IV);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Decrypt hex ciphertext string using AES-128-CBC matching AU Bank Integration Kit
 */
export function decryptAuBank(hexCiphertext, workingKey) {
  if (!hexCiphertext || !workingKey) {
    throw new Error('Ciphertext and workingKey are required for AU Bank decryption');
  }
  const key = deriveKey(workingKey);
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, AU_FIXED_IV);
  let decrypted = decipher.update(hexCiphertext.trim(), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Parse AU Bank decrypted query string into an object
 * e.g. "order_id=123&order_status=Success&amount=99.00"
 */
export function parseAuBankResponse(decryptedText) {
  const result = {};
  if (!decryptedText) return result;

  const pairs = decryptedText.split('&');
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx !== -1) {
      const key = decodeURIComponent(pair.slice(0, eqIdx).trim());
      const val = decodeURIComponent(pair.slice(eqIdx + 1).trim());
      result[key] = val;
    }
  }
  return result;
}

/**
 * Decrypt hex ciphertext string with primary key and fallback key support
 */
export function decryptAuBankWithFallback(hexCiphertext, workingKey, fallbackKey) {
  if (!hexCiphertext) {
    throw new Error('Ciphertext is required for AU Bank decryption');
  }
  if (workingKey) {
    try {
      return decryptAuBank(hexCiphertext, workingKey);
    } catch (err1) {
      if (fallbackKey && fallbackKey !== workingKey) {
        try {
          return decryptAuBank(hexCiphertext, fallbackKey);
        } catch {
          throw err1;
        }
      }
      throw err1;
    }
  } else if (fallbackKey) {
    return decryptAuBank(hexCiphertext, fallbackKey);
  }
  throw new Error('No workingKey provided for AU Bank decryption');
}

/**
 * Build URL query string from parameters for AU Bank initiate transaction
 */
export function buildAuBankQuery(params) {
  return Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

/**
 * Get configured AU Bank credentials and settings from environment
 */
export function getAuBankConfig() {
  const merchantId = (
    process.env.AUBANK_MERCHANT_ID ||
    process.env.CCAVENUE_MERCHANT_ID ||
    '4473724'
  ).trim();

  const accessCode = (
    process.env.AUBANK_ACCESS_CODE ||
    process.env.CCAVENUE_ACCESS_CODE ||
    'AVKF96NI74BF71FKFB'
  ).trim();

  const workingKey = (
    process.env.AUBANK_WORKING_KEY ||
    process.env.CCAVENUE_WORKING_KEY ||
    '6887D6B71F1858EA8148FB6721CBC317'
  ).trim();

  const accessCode2 = (
    process.env.AUBANK_ACCESS_CODE_2 ||
    'AVNC96NI73BF68CNFB'
  ).trim();

  const workingKey2 = (
    process.env.AUBANK_WORKING_KEY_2 ||
    '2A822BF6F60D18AC3FAAF4A7B8D8EFD7'
  ).trim();

  const gatewayUrl = (
    process.env.AUBANK_GATEWAY_URL ||
    process.env.CCAVENUE_GATEWAY_URL ||
    'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
  ).trim();

  // If keys are not set, we run in simulated test mode
  const isLive = Boolean(merchantId && accessCode && workingKey);

  return {
    merchantId,
    accessCode,
    workingKey,
    accessCode2,
    workingKey2,
    gatewayUrl,
    isLive,
  };
}
