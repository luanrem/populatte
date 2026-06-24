import { normalizeProjectUrls } from '../../src/core/entities/project.entity';

describe('normalizeProjectUrls', () => {
  it('returns an empty list for an empty input', () => {
    expect(normalizeProjectUrls([])).toEqual([]);
  });

  it('promotes the first URL to primary when none is flagged', () => {
    const result = normalizeProjectUrls([
      { url: 'https://a.example' },
      { url: 'https://b.example' },
    ]);

    expect(result).toEqual([
      { url: 'https://a.example', isPrimary: true },
      { url: 'https://b.example', isPrimary: false },
    ]);
  });

  it('respects an explicitly flagged primary and clears the others', () => {
    const result = normalizeProjectUrls([
      { url: 'https://a.example', isPrimary: false },
      { url: 'https://b.example', isPrimary: true },
    ]);

    expect(result).toEqual([
      { url: 'https://a.example', isPrimary: false },
      { url: 'https://b.example', isPrimary: true },
    ]);
  });

  it('keeps only the first flagged entry primary when several are flagged', () => {
    const result = normalizeProjectUrls([
      { url: 'https://a.example', isPrimary: true },
      { url: 'https://b.example', isPrimary: true },
      { url: 'https://c.example', isPrimary: true },
    ]);

    expect(result.filter((entry) => entry.isPrimary)).toEqual([
      { url: 'https://a.example', isPrimary: true },
    ]);
  });

  it('preserves order and the optional label, omitting it when absent', () => {
    const result = normalizeProjectUrls([
      { url: 'https://a.example', label: 'Main form' },
      { url: 'https://b.example' },
    ]);

    expect(result).toEqual([
      { url: 'https://a.example', isPrimary: true, label: 'Main form' },
      { url: 'https://b.example', isPrimary: false },
    ]);
    expect(result[1]).not.toHaveProperty('label');
  });
});
