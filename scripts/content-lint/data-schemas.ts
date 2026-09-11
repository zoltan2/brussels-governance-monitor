/**
 * scripts/content-lint/data-schemas.ts
 *
 * Valide data/radar.json, data/changelog.json et data/commitments.json contre
 * leurs schémas Zod (src/lib/radar.ts, changelog.ts, commitments.ts).
 *
 * Pourquoi : ces fichiers ne sont validés qu'au `next build`, au moment où une
 * page les importe. Une veille qui oublie `promotedTo: null` dans un signal
 * radar passait le pré-vol et `npx velite build`, puis cassait « Lint,
 * Typecheck & Build » en CI, contrôle exigé par /fr/admin. Ici : moins d'une
 * seconde, au pré-vol.
 *
 * Usage : npx tsx scripts/content-lint/data-schemas.ts
 */
import { getChangelog } from '../../src/lib/changelog';
import { annotate } from './annotate';

async function main(): Promise<void> {
  const failures: string[] = [];
  const check = async (name: string, load: () => Promise<unknown> | unknown) => {
    try {
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${name} :\n${msg.split('\n').slice(0, 30).join('\n')}`);
    }
  };
  // radar et commitments valident à l'import du module.
  await check('data/radar.json', () => import('../../src/lib/radar'));
  await check('data/commitments.json', () => import('../../src/lib/commitments'));
  await check('data/changelog.json', () => getChangelog('fr'));

  if (failures.length === 0) {
    console.log('OK : radar, changelog et engagements conformes à leurs schémas.');
    return;
  }
  console.error('FAIL : fichier(s) de données non conforme(s) à leur schéma :\n');
  for (const f of failures) {
    console.error(f + '\n');
    annotate('Fichier de données non conforme', f.split('\n')[0]!.replace(/ :$/, '') + ' ne respecte pas son schéma : le build de production échouerait.');
  }
  console.error('Le build de production échouerait sur ces fichiers. Voir src/lib/radar.ts, changelog.ts, commitments.ts.');
  process.exit(1);
}

void main();
