import { describe, it, expect } from 'vitest';
import { parseSort, parseIncludes } from './query-helpers.js';

describe('query-helpers', () => {
  describe('parseSort', () => {
    const validFields = ['name', 'email', 'createdAt', 'updatedAt'];

    it('should parse ascending sort', () => {
      const result = parseSort('name', validFields);
      expect(result).toEqual({ name: 'asc' });
    });

    it('should parse descending sort with - prefix', () => {
      const result = parseSort('-name', validFields);
      expect(result).toEqual({ name: 'desc' });
    });

    it('should fall back to default field for invalid fields', () => {
      const result = parseSort('invalid', validFields);
      expect(result).toEqual({ createdAt: 'asc' });
    });

    it('should fall back to default field for invalid descending fields', () => {
      const result = parseSort('-invalid', validFields);
      expect(result).toEqual({ createdAt: 'desc' });
    });

    it('should use custom default field', () => {
      const result = parseSort('invalid', validFields, 'name');
      expect(result).toEqual({ name: 'asc' });
    });

    it('should handle empty sort string', () => {
      const result = parseSort('', validFields);
      expect(result).toEqual({ createdAt: 'asc' });
    });
  });

  describe('parseIncludes', () => {
    const validIncludes = ['company', 'contacts', 'deals'];

    it('should return empty object for undefined include', () => {
      const result = parseIncludes(undefined, validIncludes);
      expect(result).toEqual({});
    });

    it('should return empty object for empty string', () => {
      const result = parseIncludes('', validIncludes);
      expect(result).toEqual({});
    });

    it('should parse single valid include', () => {
      const result = parseIncludes('company', validIncludes);
      expect(result).toEqual({ company: true });
    });

    it('should parse multiple valid includes', () => {
      const result = parseIncludes('company,contacts,deals', validIncludes);
      expect(result).toEqual({ company: true, contacts: true, deals: true });
    });

    it('should filter out invalid includes', () => {
      const result = parseIncludes('company,invalid,contacts', validIncludes);
      expect(result).toEqual({ company: true, contacts: true });
    });

    it('should handle whitespace in includes', () => {
      const result = parseIncludes('company , contacts , deals', validIncludes);
      expect(result).toEqual({ company: true, contacts: true, deals: true });
    });

    it('should return empty object for all invalid includes', () => {
      const result = parseIncludes('foo,bar,baz', validIncludes);
      expect(result).toEqual({});
    });
  });
});
