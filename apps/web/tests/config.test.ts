import { describe, it, expect } from 'vitest';
import { deriveWsUrl } from '../src/config';

describe('deriveWsUrl', () => {
  it('maps http to ws and appends /ws', () => {
    expect(deriveWsUrl('http://localhost:3001')).toBe('ws://localhost:3001/ws');
  });

  it('maps https to wss', () => {
    expect(deriveWsUrl('https://api.demo.magicyyds.com')).toBe('wss://api.demo.magicyyds.com/ws');
  });
});
