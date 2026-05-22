/**
 * UUID7 v7 generator - time-ordered, sortable UUID
 * Generates UUIDs that are ordered by creation time
 */
export function uuidv7(): string {
  // UUID v7 format: XXXXXXXX-XXXX-7XXX-XXXX-XXXXXXXXXXXX
  // - Version: 7 (time-ordered)
  // - Variant: 2 (Leach-Salz)

  // Get current timestamp in milliseconds
  const timestamp = Date.now()

  // Get random bytes for the rest of the UUID
  const randomBytes = new Uint8Array(10)
  crypto.getRandomValues(randomBytes)

  // Build the UUID according to v7 spec
  // time_high (32 bits) + time_mid (16 bits) + version+time_low (16 bits)
  const timeHigh = (timestamp / 4294967296) | 0 // floor division
  const timeMid = ((timestamp / 65536) | 0) % 65536
  const timeLow = timestamp % 65536

  // Set version to 7 in the highest 4 bits of time_low
  const versionedTimeLow = (timeLow & 0x0fff) | 0x7000

  // Set variant to 2 (RFC 4122) in the highest 2 bits of the clock sequence
  const variant = randomBytes[1] & 0x3f | 0x80

  // Format as UUID string
  const hex = (n: number, width: number) => n.toString(16).padStart(width, '0')
  const hexBytes = (bytes: Uint8Array, start: number, length: number) =>
    Array.from(bytes.slice(start, start + length))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  return `${hex(timeHigh, 8)}-${hex(timeMid, 4)}-${hex(versionedTimeLow, 4)}-${hex(variant, 2)}${hexBytes(randomBytes, 2, 1)}-${hexBytes(randomBytes, 3, 8)}`
}
