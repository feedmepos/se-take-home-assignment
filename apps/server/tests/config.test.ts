import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/infrastructure/config';

describe('loadConfig', () => {
  it('defaults to port 3001 on all interfaces', () => {
    expect(loadConfig({})).toEqual({ port: 3001, host: '0.0.0.0' });
  });

  it('reads PORT and HOST from the environment', () => {
    expect(loadConfig({ PORT: '8080', HOST: '127.0.0.1' })).toEqual({
      port: 8080,
      host: '127.0.0.1',
    });
  });
});
