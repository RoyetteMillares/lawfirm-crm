import * as nacl from "tweetnacl-js"
import { randomBytes } from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY // Must be 32 bytes, hex-encoded

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable required")
}

export async function encryptSensitiveData(
  data: Record<string, any>
): Promise<string> {
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex")
  const nonce = randomBytes(24) // TweetNaCl requires 24-byte nonce
  const plaintext = Buffer.from(JSON.stringify(data))

  const encrypted = nacl.secretbox(plaintext, nonce, keyBuffer)
  if (!encrypted) throw new Error("Encryption failed")

  // Return nonce + ciphertext as base64
  const combined = Buffer.concat([nonce, Buffer.from(encrypted)])
  return combined.toString("base64")
}

export async function decryptSensitiveData(
  encryptedData: string
): Promise<Record<string, any>> {
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex")
  const combined = Buffer.from(encryptedData, "base64")

  const nonce = combined.slice(0, 24)
  const ciphertext = combined.slice(24)

  const plaintext = nacl.secretbox.open(ciphertext, nonce, keyBuffer)
  if (!plaintext) throw new Error("Decryption failed")

  return JSON.parse(Buffer.from(plaintext).toString("utf-8"))
}
