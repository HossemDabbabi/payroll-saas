import { describe, expect, it } from 'vitest';
import { cn } from '../lib/utils';

describe('cn (class name utility)', () => {
  it('merges single class names', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', undefined, null, false, '', 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts — last class wins', () => {
    // tailwind-merge resolves conflicting utility classes
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles conditional classes correctly', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
    expect(cn('base', !isActive && 'hidden')).toBe('base');
  });

  it('handles object notation from clsx', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });
});
