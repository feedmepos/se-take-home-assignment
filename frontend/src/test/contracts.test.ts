import type { StatusDTO } from '@contracts';

describe('@contracts alias', () => {
  it('StatusDTO shape is structurally valid', () => {
    const status: StatusDTO = {
      pending: [],
      processing: [],
      complete: [],
      bots: [],
      cookDurationMs: 10000,
    };

    expect(status.pending).toEqual([]);
    expect(status.cookDurationMs).toBe(10000);
  });
});
