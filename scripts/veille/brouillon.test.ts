import { describe, expect, it } from 'vitest';
import { CHANGELOG, RADAR, appliquerOperation, lireBrouillon, planifier, type Brouillon, type Depot } from './brouillon';
import { readGuardFrontmatter } from '../../src/lib/frontmatter';

const JOUR = '2026-10-13';
const LANGUES = ['fr', 'nl', 'en', 'de'] as const;
const ANCRE = { fr: '## Population', nl: '## Bevolking', en: '## Population', de: '## Bevölkerung' };

function fiche(l: string, lastModified = '2026-10-08', extra = ''): string {
  return [
    '---',
    'title: "Anderlecht"',
    `locale: ${l}`,
    'sources:',
    '  - label: "Site officiel"',
    '    url: "https://www.anderlecht.be/"',
    '    type: official',
    '    accessedAt: "2026-10-08"',
    `lastModified: "${lastModified}"`,
    'changeType: updated',
    'changeSummary: "Ancien résumé."',
    'changeSummaryDate: "2026-10-08"',
    ...(extra ? [extra] : []),
    '---',
    '',
    'Chapeau.',
    '',
    `${ANCRE[l as keyof typeof ANCRE]} : ancienne section`,
    '',
    'Texte ancien.',
    '',
  ].join('\n');
}

function depot(fichiers: Record<string, string>, base: Record<string, string> = fichiers): Depot {
  return { lire: (c) => fichiers[c] ?? null, lireBase: (c) => base[c] ?? null };
}

function fichiersDeBase(): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of LANGUES) f[`content/commune-cards/anderlecht.${l}.mdx`] = fiche(l);
  f[CHANGELOG] = `${JSON.stringify([{ date: '2026-10-12', type: 'updated', section: 'domains', targetSlug: 'budget', descriptions: {} }], null, 4)}\n`;
  f[RADAR] = `${JSON.stringify(
    { lastVeille: '2026-10-12', entries: [{ id: '2026-10-08-ancien-signal', status: 'active', archivedAt: null, period: 'gouvernement-2026' }] },
    null,
    2,
  )}\n`;
  return f;
}

const parLangue = (t: string) => ({ fr: `${t} fr`, nl: `${t} nl`, en: `${t} en`, de: `${t} de` });

function brouillon(surcharge: Partial<Brouillon['fiches'][number]> = {}, radar: unknown[] = []): Brouillon {
  const lu = lireBrouillon(
    JSON.stringify({
      date: JOUR,
      fiches: [
        {
          fiche: 'commune-cards/anderlecht',
          changeSummary: parLangue('Un bâtiment communal est occupé pour 400 euros par an. Suite du résumé'),
          sources: [{ url: 'https://www.dhnet.be/article', type: 'media', label: parLangue('La DH, bâtiment communal') }],
          corps: [{ op: 'avant', ancre: ANCRE, texte: parLangue('## Jeunesse\n\nParagraphe neuf') }],
          ...surcharge,
        },
      ],
      radar,
    }),
  );
  if ('problemes' in lu) throw new Error(lu.problemes.join('\n'));
  return lu.brouillon;
}

describe('lireBrouillon', () => {
  it('refuse une langue manquante, une clé inconnue et une ancre sur « fin »', () => {
    const lu = lireBrouillon(
      `date: ${JOUR}\nfiches:\n  - fiche: commune-cards/anderlecht\n    changeSummary: { fr: a, nl: b, en: c }\n    inconnu: 1\n    corps:\n      - op: fin\n        ancre: { fr: a, nl: a, en: a, de: a }\n        texte: { fr: a, nl: a, en: a, de: a }\n`,
    );
    expect('problemes' in lu && lu.problemes.join('\n')).toMatch(/changeSummary\.de[\s\S]*ancre obligatoire[\s\S]*inconnu|inconnu/);
    expect('problemes' in lu && lu.problemes.length).toBeGreaterThanOrEqual(3);
  });

  it('garde la date en chaîne et refuse un brouillon vide', () => {
    expect(lireBrouillon(`date: ${JOUR}\n`)).toEqual({ problemes: [expect.stringContaining('brouillon vide')] });
    expect(lireBrouillon('date: [')).toEqual({ problemes: [expect.stringContaining('YAML illisible')] });
  });
});

describe('planifier, fiche', () => {
  it('écrit les quatre langues, le frontmatter, la source en tête et la section avant l\'ancre', () => {
    const plan = planifier(brouillon(), depot(fichiersDeBase()));
    expect(plan.problemes).toEqual([]);
    expect(plan.mdx).toHaveLength(4);
    const de = plan.ecritures.get('content/commune-cards/anderlecht.de.mdx')!;
    const lu = readGuardFrontmatter(de)!;
    expect(lu.lastModified).toBe(JOUR);
    expect(lu.changeSummaryDate).toBe(JOUR);
    expect(lu.changeSummary).toBe('Un bâtiment communal est occupé pour 400 euros par an. Suite du résumé de');
    expect((lu.sources as { url: string; accessedAt: string }[])[0]).toMatchObject({ url: 'https://www.dhnet.be/article', accessedAt: JOUR });
    expect((lu.sources as unknown[]).length).toBe(2);
    expect(de).toContain('Chapeau.\n\n## Jeunesse\n\nParagraphe neuf de\n\n## Bevölkerung : ancienne section\n');
    // Les lignes non visées ne bougent pas.
    expect(de).toContain('title: "Anderlecht"\nlocale: de\nsources:\n  - label: "La DH, bâtiment communal de"');
  });

  it('échappe un guillemet droit sans casser le YAML', () => {
    const cs = { ...parLangue('Résumé'), en: 'The "ambassadors" are on hold. More' };
    const plan = planifier(brouillon({ changeSummary: cs }), depot(fichiersDeBase()));
    expect(plan.problemes).toEqual([]);
    expect(readGuardFrontmatter(plan.ecritures.get('content/commune-cards/anderlecht.en.mdx')!)!.changeSummary).toBe(cs.en);
  });

  it('refuse une fiche déjà datée du jour sur la branche de base', () => {
    const base = fichiersDeBase();
    const dejaFusionnee = { ...base, 'content/commune-cards/anderlecht.fr.mdx': fiche('fr', JOUR) };
    const plan = planifier(brouillon(), depot(base, dejaFusionnee));
    expect(plan.problemes).toEqual([expect.stringMatching(/anderlecht\.fr\.mdx : déjà datée du 2026-10-13/)]);
  });

  it('signale toutes les ancres fautives, pas seulement la première', () => {
    const f = fichiersDeBase();
    f['content/commune-cards/anderlecht.nl.mdx'] = f['content/commune-cards/anderlecht.nl.mdx']!.replace('## Bevolking', '## Inwoners');
    f['content/commune-cards/anderlecht.de.mdx'] += '\n## Bevölkerung : doublon\n';
    const plan = planifier(brouillon(), depot(f));
    expect(plan.problemes).toEqual([
      expect.stringMatching(/anderlecht\.nl\.mdx : corps\[0\] \(avant\) : ancre introuvable/),
      expect.stringMatching(/anderlecht\.de\.mdx : corps\[0\] \(avant\) : ancre présente 2 fois/),
    ]);
  });

  it('refuse une accroche de plus de 120 caractères et une date allemande à ordinal', () => {
    const longue = `${'Un bâtiment communal de Cureghem est occupé depuis août 2025 pour quatre cents euros par an sans appel à candidatures ni loyer'}. Suite.`;
    const cs = { ...parLangue('Résumé court. Suite'), fr: longue, de: 'Der Polizist starb in der Nacht vom 12. Oktober 2026 in Jette. Mehr.' };
    const plan = planifier(brouillon({ changeSummary: cs }), depot(fichiersDeBase()));
    expect(plan.problemes).toEqual([
      expect.stringMatching(/anderlecht\.fr\.mdx : changeSummary : titre tronqué/),
      expect.stringMatching(/anderlecht\.de\.mdx : changeSummary : titre coupé sur une date allemande/),
    ]);
  });

  it('refuse une source sur une fiche sans champ sources, et une source déjà citée', () => {
    const f = fichiersDeBase();
    f['content/commune-cards/anderlecht.fr.mdx'] = f['content/commune-cards/anderlecht.fr.mdx']!.replace(/sources:\n(?: {2,}.*\n)+/, '');
    const sansChamp = planifier(brouillon(), depot(f));
    expect(sansChamp.problemes).toEqual([expect.stringMatching(/anderlecht\.fr\.mdx : pas de champ sources/)]);

    const double = brouillon({ sources: [{ url: 'https://www.anderlecht.be', type: 'official', label: parLangue('Site') }] });
    expect(planifier(double, depot(fichiersDeBase())).problemes).toHaveLength(4);
  });

  it('refuse changeType autre que updated, digestHeadline, et un scalaire sur plusieurs lignes', () => {
    const f = fichiersDeBase();
    f['content/commune-cards/anderlecht.fr.mdx'] = fiche('fr').replace('changeType: updated', 'changeType: corrected');
    f['content/commune-cards/anderlecht.nl.mdx'] = fiche('nl', '2026-10-08', 'digestHeadline: "Titre"');
    f['content/commune-cards/anderlecht.en.mdx'] = fiche('en').replace('changeSummary: "Ancien résumé."', 'changeSummary: >-\n  Ancien résumé.');
    const p = planifier(brouillon(), depot(f)).problemes.join('\n');
    expect(p).toMatch(/anderlecht\.fr\.mdx : changeType autre que/);
    expect(p).toMatch(/anderlecht\.nl\.mdx : digestHeadline présent/);
    expect(p).toMatch(/anderlecht\.en\.mdx : changeSummary est écrit sur plusieurs lignes/);
  });

  it('ne pose une date de relecture que si le brouillon la déclare', () => {
    const f = fichiersDeBase();
    for (const l of LANGUES) f[`content/commune-cards/anderlecht.${l}.mdx`] = fiche(l, '2026-10-08', 'statusReviewed: "2026-09-01"');
    const sans = planifier(brouillon(), depot(f)).ecritures.get('content/commune-cards/anderlecht.fr.mdx')!;
    expect(sans).toContain('statusReviewed: "2026-09-01"');
    const avec = planifier(brouillon({ relectures: ['statusReviewed', 'faqReviewed'] }), depot(f)).ecritures.get('content/commune-cards/anderlecht.fr.mdx')!;
    expect(avec).toContain(`statusReviewed: "${JOUR}"`);
    expect(avec).toContain(`lastModified: "${JOUR}"\nfaqReviewed: "${JOUR}"`);
  });

  it('refuse un brouillon déjà appliqué', () => {
    const premier = planifier(brouillon(), depot(fichiersDeBase()));
    const apres = { ...fichiersDeBase(), ...Object.fromEntries(premier.ecritures) };
    const p = planifier(brouillon(), depot(apres, fichiersDeBase())).problemes.join('\n');
    expect(p).toMatch(/texte déjà présent dans la fiche/);
    expect(p).toMatch(/une entrée communes\/anderlecht existe déjà au 2026-10-13/);
  });
});

describe('appliquerOperation', () => {
  const corps = 'Un.\n\nDeux, ligne a\nligne b.\n\nTrois.\n';
  it('apres insère à la fin du paragraphe de l\'ancre, fin ajoute en bas', () => {
    expect(appliquerOperation(corps, 'apres', 'Deux', 'Neuf.\n')).toEqual({ corps: 'Un.\n\nDeux, ligne a\nligne b.\n\nNeuf.\n\nTrois.\n' });
    expect(appliquerOperation(corps, 'apres', 'Trois', 'Neuf.\n')).toEqual({ corps: `${corps}\nNeuf.\n` });
    expect(appliquerOperation(corps, 'fin', undefined, 'Neuf.\n')).toEqual({ corps: `${corps}\nNeuf.\n` });
  });
  it('remplacer échange l\'ancre sans ajouter de saut de ligne, avant exige un début de ligne', () => {
    expect(appliquerOperation(corps, 'remplacer', 'ligne a', 'ligne A\n')).toEqual({ corps: corps.replace('ligne a', 'ligne A') });
    expect(appliquerOperation(corps, 'avant', 'ligne a', 'Neuf.')).toEqual({ probleme: expect.stringContaining('pas en début de ligne') });
  });
});

describe('planifier, changelog et radar', () => {
  it('reprend le changeSummary dans le changelog et le radar, indentations 4 et 2', () => {
    const b = brouillon({}, [
      { id: '2026-10-13-anderlecht-batiment', confidence: 'unconfirmed', cards: ['anderlecht'], promotedTo: 'anderlecht', source: { label: 'La DH', url: 'https://www.dhnet.be/article' }, nextStep: parLangue('Suivi annoncé') },
      { archiver: '2026-10-08-ancien-signal' },
    ]);
    const plan = planifier(b, depot(fichiersDeBase()));
    expect(plan.problemes).toEqual([]);

    const journal = plan.ecritures.get(CHANGELOG)!;
    expect(journal.startsWith('[\n    {\n        "date": "2026-10-13",')).toBe(true);
    expect(JSON.parse(journal)[0]).toEqual({
      date: JOUR,
      type: 'updated',
      section: 'communes',
      targetSlug: 'anderlecht',
      descriptions: parLangue('Un bâtiment communal est occupé pour 400 euros par an. Suite du résumé'),
    });
    expect(JSON.parse(journal)).toHaveLength(2);

    const radar = plan.ecritures.get(RADAR)!;
    expect(radar.startsWith('{\n  "lastVeille": "2026-10-13",')).toBe(true);
    const [neuf, ancien] = JSON.parse(radar).entries;
    expect(Object.keys(neuf)).toEqual(['id', 'date', 'confidence', 'status', 'cards', 'promotedSection', 'promotedTo', 'archivedAt', 'period', 'source', 'summary', 'descriptions', 'nextStep']);
    expect(neuf).toMatchObject({ status: 'active', promotedSection: 'communes', period: 'gouvernement-2026', source: { accessedAt: JOUR } });
    expect(neuf.summary.fr).toBe('Un bâtiment communal est occupé pour 400 euros par an.');
    expect(neuf.descriptions.de).toBe('Un bâtiment communal est occupé pour 400 euros par an. Suite du résumé de');
    expect(ancien).toMatchObject({ id: '2026-10-08-ancien-signal', status: 'archived', archivedAt: JOUR });
  });

  it('signal sans fiche : pas de promotedSection, textes obligatoires et bornés', () => {
    const sig = { id: '2026-10-13-recyparc', confidence: 'unconfirmed', cards: ['cleanliness'], promotedTo: null, source: { label: 'La DH', url: 'https://www.dhnet.be/b' }, nextStep: parLangue('Concertation') };
    expect(planifier(brouillon({}, [sig]), depot(fichiersDeBase())).problemes).toEqual([expect.stringMatching(/radar 2026-10-13-recyparc : summary et descriptions obligatoires/)]);

    const complet = { ...sig, summary: { ...parLangue('Recyparc : un projet pilote de rendez-vous'), de: 'Kurz' }, descriptions: parLangue('Description') };
    const plan = planifier(brouillon({}, [complet]), depot(fichiersDeBase()));
    expect(plan.problemes).toEqual([expect.stringMatching(/radar 2026-10-13-recyparc : summary\.de trop court/)]);
    expect('promotedSection' in JSON.parse(plan.ecritures.get(RADAR)!).entries[0]).toBe(false);
  });

  it('remplace un signal existant, refuse un doublon, un archivage inconnu et une fiche promue introuvable', () => {
    const base = { confidence: 'official', cards: ['anderlecht'], source: { label: 'La DH', url: 'https://www.dhnet.be/c' }, nextStep: parLangue('Suite') };
    const remplace = planifier(brouillon({}, [{ ...base, id: '2026-10-08-ancien-signal', remplace: true, promotedTo: 'anderlecht' }]), depot(fichiersDeBase()));
    expect(remplace.problemes).toEqual([]);
    expect(JSON.parse(remplace.ecritures.get(RADAR)!).entries).toHaveLength(1);

    const fautes = planifier(
      brouillon({}, [
        { ...base, id: '2026-10-08-ancien-signal', promotedTo: 'anderlecht' },
        { ...base, id: '2026-10-13-absent', remplace: true, promotedTo: 'anderlecht' },
        { ...base, id: '2026-10-13-ailleurs', promotedTo: 'inconnue', summary: parLangue('Un résumé assez long pour passer'), descriptions: parLangue('Description') },
        { archiver: '2026-01-01-inconnu' },
      ]),
      depot(fichiersDeBase()),
    ).problemes.join('\n');
    expect(fautes).toMatch(/2026-10-08-ancien-signal : cet identifiant existe déjà/);
    expect(fautes).toMatch(/2026-10-13-absent : remplace: true, mais ce signal n'existe pas/);
    expect(fautes).toMatch(/2026-10-13-ailleurs : promotedTo « inconnue » ne correspond à aucune fiche/);
    expect(fautes).toMatch(/signal à archiver introuvable, 2026-01-01-inconnu/);
  });

  it('refuse un fichier de données qui ne se réécrit pas à l\'identique', () => {
    const f = fichiersDeBase();
    f[CHANGELOG] = JSON.stringify(JSON.parse(f[CHANGELOG]!), null, 2);
    const plan = planifier(brouillon(), depot(f));
    expect(plan.problemes).toEqual([expect.stringMatching(/changelog\.json : le fichier ne se réécrit pas à l'identique/)]);
    expect(plan.ecritures.has(CHANGELOG)).toBe(false);
  });
});
