import { describe, expect, it } from 'vitest'
import { formatHHMMSS } from './time'

describe('formatHHMMSS', () => {
  it('pads hours, minutes and seconds to two digits', () => {
    const t = new Date()
    t.setHours(3, 5, 7, 0)
    expect(formatHHMMSS(t.getTime())).toBe('03:05:07')
  })

  it('formats midnight as 00:00:00', () => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    expect(formatHHMMSS(t.getTime())).toBe('00:00:00')
  })

  it('formats end-of-day as 23:59:59', () => {
    const t = new Date()
    t.setHours(23, 59, 59, 0)
    expect(formatHHMMSS(t.getTime())).toBe('23:59:59')
  })
})
