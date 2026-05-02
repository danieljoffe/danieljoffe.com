import { parsePartialJson } from '../parsePartialJson';

describe('parsePartialJson', () => {
  it('returns null for empty buffer', () => {
    expect(parsePartialJson('')).toBeNull();
  });

  it('parses complete JSON unchanged', () => {
    expect(parsePartialJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
  });

  it('closes an open string', () => {
    expect(parsePartialJson('{"summary": "hello world')).toEqual({
      summary: 'hello world',
    });
  });

  it('closes an open object', () => {
    expect(parsePartialJson('{"a": 1')).toEqual({ a: 1 });
  });

  it('closes nested arrays and objects', () => {
    expect(parsePartialJson('{"roles": [{"id": "r1"')).toEqual({
      roles: [{ id: 'r1' }],
    });
  });

  it('strips trailing comma', () => {
    expect(parsePartialJson('{"a": 1,')).toEqual({ a: 1 });
  });

  it('appends null for dangling key', () => {
    expect(parsePartialJson('{"a": 1, "b":')).toEqual({ a: 1, b: null });
  });

  it('drops in-progress key without colon', () => {
    // {"a": 1, "b → top-level comma fallback gives {"a": 1}
    expect(parsePartialJson('{"a": 1, "b')).toEqual({ a: 1 });
  });

  it('keeps complete fields when later field is partial', () => {
    const partial =
      '{"summary": "Senior FE", "roles": [{"id": "r1", "company": "Acme"';
    const result = parsePartialJson<{
      summary: string;
      roles: { id: string; company: string }[];
    }>(partial);
    expect(result?.summary).toBe('Senior FE');
    expect(result?.roles).toHaveLength(1);
    expect(result?.roles[0]).toEqual({ id: 'r1', company: 'Acme' });
  });

  it('handles escaped quotes inside strings', () => {
    expect(parsePartialJson('{"q": "she said \\"hi\\"')).toEqual({
      q: 'she said "hi"',
    });
  });

  it('returns null when no recoverable prefix exists', () => {
    // Just the start of a key — nothing to recover.
    expect(parsePartialJson('{"abc')).toBeNull();
  });
});
