import { describe, it, expect, vi } from 'vitest';

// parsePagination is a pure helper — no mocks needed. Import via the module
// graph without touching prisma (routes.ts imports it, but the helper itself
// has no DB dependency; @fivem-ai/db is mocked so importing routes is safe).
vi.mock('@fivem-ai/db', () => {
  const prisma = new Proxy({}, { get: () => ({}) });
  return { prisma, default: prisma };
});
vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const { parsePagination } = await import('./src/http/routes');

describe('parsePagination', () => {
  it('defaults to take=50 skip=0 with no query', () => {
    expect(parsePagination({})).toEqual({ skip: 0, take: 50 });
  });

  it('parses valid limit/offset strings', () => {
    expect(parsePagination({ limit: '10', offset: '20' })).toEqual({ skip: 20, take: 10 });
    expect(parsePagination({ limit: '25', skip: '5' })).toEqual({ skip: 5, take: 25 });
  });

  it('falls back to defaults for invalid (non-numeric) input instead of NaN', () => {
    expect(parsePagination({ limit: 'abc', offset: 'xyz' })).toEqual({ skip: 0, take: 50 });
  });

  it('clamps take to MAX_PAGE_SIZE=200 and floors at 1', () => {
    expect(parsePagination({ limit: '100000' }).take).toBe(200);
    expect(parsePagination({ limit: '0' }).take).toBe(1);
    expect(parsePagination({ limit: '-50' }).take).toBe(1);
  });

  it('clamps negative offsets to 0', () => {
    expect(parsePagination({ offset: '-10' }).skip).toBe(0);
  });

  it('accepts numeric (non-string) values', () => {
    expect(parsePagination({ limit: 7, offset: 14 })).toEqual({ skip: 14, take: 7 });
  });

  describe('opts.defaultTake', () => {
    it('raises the no-param default while staying under MAX_PAGE_SIZE', () => {
      expect(parsePagination({}, { defaultTake: 200 })).toEqual({ skip: 0, take: 200 });
    });

    it('is capped at MAX_PAGE_SIZE even when raised', () => {
      expect(parsePagination({}, { defaultTake: 100000 }).take).toBe(200);
    });

    it('never overrides an explicit client limit', () => {
      expect(parsePagination({ limit: '10' }, { defaultTake: 200 })).toEqual({ skip: 0, take: 10 });
    });

    it('invalid input still falls back to the raised default', () => {
      expect(parsePagination({ limit: 'abc' }, { defaultTake: 200 })).toEqual({ skip: 0, take: 200 });
    });
  });
});
