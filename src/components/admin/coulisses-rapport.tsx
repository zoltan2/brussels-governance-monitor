// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Rapport d'envoi des coulisses, lisible (5 novembre 2026). Remplace le JSON
 * brut affiché jusque-là dans /fr/admin/coulisses. Le JSON reste consultable,
 * replié, en bas du bloc. Un rapport de forme inattendue (ancien format,
 * champ ajouté) n'est jamais caché : il s'affiche brut.
 */

const LANGUES: Record<string, string> = { fr: 'Français', nl: 'Nederlands', en: 'English' };
const VARIANTES: Record<string, string> = { premier: 'premier mot', courant: 'numéro courant' };

/** Motifs d'exclusion, au singulier et au pluriel (src/lib/coulisses/selection.ts). */
const MOTIFS: Record<string, [string, string]> = {
  desinscrit: ['désabonné du site', 'désabonnés du site'],
  refus: ['a refusé les coulisses', 'ont refusé les coulisses'],
  interne: ['adresse interne (liste d’exclusion)', 'adresses internes (liste d’exclusion)'],
  langue: ['sans langue reconnue', 'sans langue reconnue'],
  date: ['sans date d’inscription lisible', 'sans date d’inscription lisible'],
  recent: ['inscrit depuis moins de 21 jours', 'inscrits depuis moins de 21 jours'],
  deja_envoye: ['l’avait déjà reçu (reprise)', 'l’avaient déjà reçu (reprise)'],
};

const ETATS_JOURNAL: Record<string, [string, string]> = {
  envoye: ['envoyé', 'envoyés'],
  reserve: ['réservé, en cours', 'réservés, en cours'],
  incertain: ['incertain, à vérifier dans Resend', 'incertains, à vérifier dans Resend'],
};

interface Rapport {
  numero: number;
  debut: string;
  fin: string;
  envoyes: Record<string, number>;
  exclus: Record<string, number>;
  refusesParResend: number;
  incertains: number;
  erreurs: string[];
}

function estComptes(v: unknown): v is Record<string, number> {
  return typeof v === 'object' && v !== null && Object.values(v).every((n) => typeof n === 'number');
}

export function lireRapport(v: unknown): Rapport | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;
  const ok =
    typeof r.numero === 'number' &&
    typeof r.debut === 'string' &&
    typeof r.fin === 'string' &&
    estComptes(r.envoyes) &&
    estComptes(r.exclus) &&
    typeof r.refusesParResend === 'number' &&
    typeof r.incertains === 'number' &&
    Array.isArray(r.erreurs) &&
    r.erreurs.every((e) => typeof e === 'string');
  return ok ? (r as unknown as Rapport) : null;
}

const nombre = (n: number) => new Intl.NumberFormat('fr-BE').format(n);
const accord = (n: number, [un, plusieurs]: [string, string]) => `${nombre(n)} ${n > 1 ? plusieurs : un}`;
const somme = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);

function dateHeure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const jour = new Intl.DateTimeFormat('fr-BE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Brussels',
  }).format(d);
  const heure = new Intl.DateTimeFormat('fr-BE', {
    hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Brussels',
  }).formatToParts(d);
  const h = heure.find((p) => p.type === 'hour')?.value ?? '';
  const m = heure.find((p) => p.type === 'minute')?.value ?? '';
  return `${jour} à ${Number(h)} h ${m}`;
}

function duree(debut: string, fin: string): string | null {
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

function Chiffre({ valeur, libelle, alerte = false }: { valeur: number; libelle: string; alerte?: boolean }) {
  return (
    <div className={`rounded border p-3 ${alerte ? 'border-status-delayed/40 bg-status-delayed/5' : 'border-neutral-200'}`}>
      <p className={`text-2xl font-semibold tabular-nums ${alerte ? 'text-status-delayed' : 'text-neutral-900'}`}>{nombre(valeur)}</p>
      <p className="text-xs text-neutral-700">{libelle}</p>
    </div>
  );
}

export function CoulissesRapport({ rapport, journal }: { rapport: unknown; journal: Record<string, number> }) {
  const r = lireRapport(rapport);
  const lignesJournal = Object.entries(journal).filter(([, n]) => n > 0);

  // Tableau langue × variante, seulement les variantes présentes.
  const parLangue = new Map<string, Record<string, number>>();
  const variantes = new Set<string>();
  for (const [cle, n] of Object.entries(r?.envoyes ?? {})) {
    const [langue, ...reste] = cle.split('-');
    const variante = reste.join('-') || '?';
    variantes.add(variante);
    parLangue.set(langue, { ...(parLangue.get(langue) ?? {}), [variante]: n });
  }
  const rang = (l: string) => {
    const i = Object.keys(LANGUES).indexOf(l);
    return i === -1 ? Infinity : i;
  };
  const ordreLangues = [...parLangue.keys()].sort((a, b) => rang(a) - rang(b));
  const colonnes = [...variantes];
  const exclusPresents = Object.entries(r?.exclus ?? {}).filter(([, n]) => n > 0);
  const exclusAbsents = Object.entries(r?.exclus ?? {}).filter(([, n]) => n === 0);

  return (
    <section aria-labelledby="coulisses-rapport-titre" className="space-y-4 rounded border border-neutral-200 p-4 text-sm text-neutral-800">
      <h2 id="coulisses-rapport-titre" className="text-base font-semibold text-neutral-900">
        {r ? `Rapport d’envoi du numéro ${r.numero}` : 'Journal et rapport'}
      </h2>

      {r && (
        <>
          <p>
            Parti le {dateHeure(r.debut)}
            {duree(r.debut, r.fin) ? `, en ${duree(r.debut, r.fin)}` : ''}.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Chiffre valeur={somme(r.envoyes)} libelle="envoyés" />
            <Chiffre valeur={somme(r.exclus)} libelle="non envoyés (exclus)" />
            <Chiffre valeur={r.refusesParResend} libelle="refusés par Resend" alerte={r.refusesParResend > 0} />
            <Chiffre valeur={r.incertains} libelle="incertains, à vérifier dans Resend" alerte={r.incertains > 0} />
          </div>

          {ordreLangues.length > 0 && (
            <table className="w-full max-w-lg text-left">
              <caption className="mb-1 text-left text-xs font-semibold text-neutral-900">Envoyés par langue</caption>
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-700">
                  <th scope="col" className="py-1 pr-4 font-medium">Langue</th>
                  {colonnes.map((v) => (
                    <th key={v} scope="col" className="py-1 pr-4 text-right font-medium">{VARIANTES[v] ?? v}</th>
                  ))}
                  {colonnes.length > 1 && <th scope="col" className="py-1 text-right font-medium">Total</th>}
                </tr>
              </thead>
              <tbody>
                {ordreLangues.map((l) => {
                  const c = parLangue.get(l) ?? {};
                  return (
                    <tr key={l} className="border-b border-neutral-100">
                      <th scope="row" className="py-1 pr-4 font-normal">{LANGUES[l] ?? l}</th>
                      {colonnes.map((v) => (
                        <td key={v} className="py-1 pr-4 text-right tabular-nums">{nombre(c[v] ?? 0)}</td>
                      ))}
                      {colonnes.length > 1 && <td className="py-1 text-right tabular-nums">{nombre(somme(c))}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div>
            <h3 className="text-xs font-semibold text-neutral-900">Pourquoi certains abonnés ne l’ont pas reçu</h3>
            {exclusPresents.length > 0 ? (
              <ul className="mt-1 list-disc pl-5">
                {exclusPresents.map(([motif, n]) => (
                  <li key={motif}>{accord(n, MOTIFS[motif] ?? [motif, motif])}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">Personne n’a été exclu.</p>
            )}
            {exclusAbsents.length > 0 && (
              <p className="mt-1 text-xs text-neutral-700">
                Aucun : {exclusAbsents.map(([motif]) => (MOTIFS[motif] ?? [motif, motif])[1]).join(', ')}.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-neutral-900">Erreurs</h3>
            {r.erreurs.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-status-delayed">
                {r.erreurs.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            ) : (
              <p className="mt-1">Aucune erreur.</p>
            )}
          </div>
        </>
      )}

      {lignesJournal.length > 0 && (
        <p className="text-xs text-neutral-700">
          Journal d’envoi (base du serveur) :{' '}
          {lignesJournal.map(([etat, n]) => accord(n, ETATS_JOURNAL[etat] ?? [etat, etat])).join(', ')}.
        </p>
      )}

      {rapport != null && (
        <details className="text-xs text-neutral-700">
          <summary className="cursor-pointer">{r ? 'Rapport brut (JSON)' : 'Rapport (format inattendu, affiché brut)'}</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rapport, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
