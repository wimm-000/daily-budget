import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  describe('basic class merging', () => {
    it('returns empty string for no arguments', () => {
      expect(cn()).toBe('')
    })

    it('returns single class unchanged', () => {
      expect(cn('foo')).toBe('foo')
    })

    it('merges multiple classes', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles multiple string arguments', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c')
    })
  })

  describe('conditional classes', () => {
    it('filters out falsy values', () => {
      expect(cn('a', false, 'b')).toBe('a b')
      expect(cn('a', null, 'b')).toBe('a b')
      expect(cn('a', undefined, 'b')).toBe('a b')
      expect(cn('a', '', 'b')).toBe('a b')
      expect(cn('a', 0, 'b')).toBe('a b')
    })

    it('handles boolean conditional classes', () => {
      const isActive = true
      const isDisabled = false
      expect(cn('btn', isActive && 'active', isDisabled && 'disabled')).toBe('btn active')
    })

    it('handles ternary conditional classes', () => {
      const variant = 'primary'
      expect(cn('btn', variant === 'primary' ? 'primary' : 'secondary')).toBe('btn primary')
    })
  })

  describe('object syntax', () => {
    it('handles object with boolean values', () => {
      expect(cn({ foo: true, bar: false })).toBe('foo')
    })

    it('handles mixed array and object syntax', () => {
      expect(cn('base', { foo: true, bar: false })).toBe('base foo')
    })
  })

  describe('array syntax', () => {
    it('handles array of classes', () => {
      expect(cn(['a', 'b'])).toBe('a b')
    })

    it('handles nested arrays', () => {
      expect(cn(['a', ['b', 'c']])).toBe('a b c')
    })

    it('handles mixed array, string, and object', () => {
      expect(cn(['a'], 'b', { c: true })).toBe('a b c')
    })
  })
})
