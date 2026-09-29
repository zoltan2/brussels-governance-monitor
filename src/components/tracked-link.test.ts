// Garde du 28/09/2026 : un <Link> (navigation client de Next) ne doit jamais porter
// data-umami-event. Sur un lien annoté, le traceur Umami bloque le clic, attend son
// envoi puis recharge toute la page. La mesure d'un lien interne passe par
// <TrackedLink event="…"> (src/components/tracked-link.tsx).
import { describe, expect, it } from 'vitest';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');

describe('liens internes mesurés', () => {
  const fichiers = globSync('**/*.tsx', { cwd: SRC }).filter((f) => !/\.test\.tsx$/.test(f));

  it('témoin : le dépôt contient des <Link> et des <TrackedLink>', () => {
    const tout = fichiers.map((f) => readFileSync(join(SRC, f), 'utf8')).join('\n');
    expect(tout).toMatch(/<Link\b/);
    expect(tout).toMatch(/<TrackedLink\b/);
  });

  it('aucun <Link> ne porte data-umami-event (rechargement complet au clic)', () => {
    const fautifs: string[] = [];
    for (const f of fichiers) {
      const s = readFileSync(join(SRC, f), 'utf8');
      for (const m of s.matchAll(/<Link\b[^>]*?data-umami-event/g)) {
        fautifs.push(`${f}:${s.slice(0, m.index).split('\n').length}`);
      }
    }
    expect(fautifs, 'Utiliser <TrackedLink event="…" eventData={…}>').toEqual([]);
  });
});
