import { describe, it, expect } from 'vitest';
import { mdToText } from './md-to-text';

describe('mdToText', () => {
  it('strips inline links to their text', () => {
    expect(mdToText('Voir [le rapport](https://x.be/a) ici')).toBe('Voir le rapport ici');
  });
  it('strips bold and italic', () => {
    expect(mdToText('**14 246** étudiants au _RIS_')).toBe('14 246 étudiants au RIS');
  });
  it('strips inline code', () => {
    expect(mdToText('le champ `faq` du frontmatter')).toBe('le champ faq du frontmatter');
  });
  it('unescapes backslash-escaped markdown chars', () => {
    expect(mdToText('Coût 5\\* M€ et **gras**')).toBe('Coût 5* M€ et gras');
  });
  it('collapses whitespace and trims', () => {
    expect(mdToText('  a\n\n  b   c ')).toBe('a b c');
  });
  it('returns plain text unchanged', () => {
    expect(mdToText('Trois autorités décident.')).toBe('Trois autorités décident.');
  });
});
