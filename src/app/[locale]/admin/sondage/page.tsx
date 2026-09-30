// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Admin du sondage lecteurs : effectifs bruts avec n (JAMAIS de pourcentage :
 * plan d'analyse de la spec, § 13), verbatims de Q8 (citables à part), liste
 * des volontaires de Q9 (seule vue qui affiche des coordonnées), deux exports CSV
 * séparés et la purge. Les routes appelées (/api/admin/sondage/*) contrôlent
 * chacune la session : le garde du layout ne couvre pas les routes API.
 */
import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/require-admin';
import { synthese } from '@/lib/sondage/admin';
import { campagneDepuisEnv, etatCampagne, FIN_CONSERVATION_ENTRETIENS, FIN_CONSERVATION_REPONSES, piloteParEnv } from '@/lib/sondage/campagne';
import { CONFIRMATION_PURGE } from '@/lib/sondage/purge';
import { tousLesEntretiens } from '@/lib/sondage/store';
import { TEXTES } from '@/lib/sondage/textes';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin · Sondage lecteurs',
  robots: { index: false, follow: false },
};

const T = TEXTES.fr;
const TITRES: Record<string, string> = {
  q1: 'Q1. Habitude',
  q1b: 'Q1b. Ce qui empêche',
  q2: 'Q2. S’il disparaissait',
  q3: 'Q3. Les liens',
  q4: 'Q4. Le site',
  q4a: 'Q4a. Ce qu’on y cherche',
  q4b: 'Q4b. Ce qui en retient',
  q6a: 'Q6a. Podcast : écoute passée',
  q6b: 'Q6b. Podcast : reprise',
  q7: 'Q7. Une seule chose',
  q9: 'Q9. Un échange',
};

const CARTE = 'rounded-lg border border-neutral-200 bg-neutral-50 p-4';
const H2 = 'mb-4 font-mono text-xs uppercase tracking-[0.22em] text-neutral-600';
const BOUTON =
  'rounded-md border border-neutral-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100';

export default async function AdminSondagePage({
  searchParams,
}: {
  searchParams: Promise<{ entretiens?: string; reponses?: string; vue?: string }>;
}) {
  await requireAdmin();
  // Le layout contrôle aussi la session, mais Next rend la page même quand il
  // redirige : le contrôle ci-dessus est celui qui protège les adresses.
  const purge = await searchParams;
  const db = getDb();
  const campagne = campagneDepuisEnv();
  const etat = etatCampagne(new Date(), campagne);

  if (!db) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl tracking-tight text-neutral-900">Sondage lecteurs</h1>
        <p role="alert" className="mt-4 text-sm text-neutral-800">
          Base SQLite non configurée sur cet environnement (DB_PATH absent) : rien à afficher.
        </p>
      </div>
    );
  }

  const vue = purge.vue === 'pilote' ? 'pilote' : 'reel';
  const s = synthese(db, vue);
  const entretiens = tousLesEntretiens(db);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 border-b border-neutral-200 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-600">Admin</p>
        <h1 className="mt-2 text-3xl tracking-tight text-neutral-900">Sondage lecteurs</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Campagne {etat === 'ouverte' ? 'ouverte' : etat === 'close' ? 'close' : 'pas encore ouverte'} : du{' '}
          {campagne.ouverture} au {campagne.cloture} inclus. Pages : /fr/sondage, /nl/enquete.
          {piloteParEnv() && ' Mode pilote actif (SONDAGE_PILOTE=1) : toutes les nouvelles réponses sont marquées pilote.'}
        </p>
        <p className="mt-2 text-sm text-neutral-700">
          Effectifs bruts, jamais de pourcentage.{' '}
          {vue === 'pilote'
            ? 'Vue pilote : seules les réponses pilotes terminées sont comptées, jamais mélangées aux réelles.'
            : 'Seules les réponses terminées et hors pilote sont comptées.'}
        </p>
        <nav aria-label="Vue des réponses" className="mt-4 flex gap-3 text-sm">
          <a
            href="?"
            aria-current={vue === 'reel' ? 'page' : undefined}
            className={vue === 'reel' ? 'font-semibold text-neutral-900 underline' : 'text-brand-700 underline'}
          >
            Réponses réelles
          </a>
          <a
            href="?vue=pilote"
            aria-current={vue === 'pilote' ? 'page' : undefined}
            className={vue === 'pilote' ? 'font-semibold text-neutral-900 underline' : 'text-brand-700 underline'}
          >
            Réponses pilotes ({s.pilotes})
          </a>
        </nav>
        {purge.entretiens !== undefined && (
          <p role="status" className="mt-4 rounded border border-neutral-300 px-4 py-3 text-sm text-neutral-900">
            Purge faite : {purge.entretiens} volontaire(s) supprimé(s) (adresses et téléphones), {purge.reponses ?? 0} réponse(s) supprimée(s),
            puis VACUUM.
          </p>
        )}
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-4">
        {[
          [vue === 'pilote' ? 'Pilotes terminées' : 'Terminées (hors pilote)', s.terminees],
          ['Commencées, non terminées', s.enCours],
          ['Durée médiane', s.dureeMedianeS === null ? '–' : `${Math.floor(s.dureeMedianeS / 60)} min ${s.dureeMedianeS % 60} s`],
          ['Volontaires Q9', entretiens.length],
        ].map(([libelle, n]) => (
          <div key={libelle} className={CARTE}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-600">{libelle}</p>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-neutral-900">{n}</p>
          </div>
        ))}
      </section>

      {Object.keys(s.abandonsParEtape).length > 0 && (
        <section className="mb-10">
          <h2 className={H2}>Non terminées, par dernière étape enregistrée</h2>
          <p className="text-sm text-neutral-800">
            {Object.entries(s.abandonsParEtape)
              .map(([etape, n]) => `${etape} : ${n}`)
              .join(' · ')}
          </p>
        </section>
      )}

      <section className="mb-12">
        <h2 className={H2}>Effectifs par question</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {s.questions.map((q) => (
            <div key={q.etape} className={CARTE}>
              <table className="w-full text-sm">
                <caption className="mb-2 text-left text-sm font-semibold text-neutral-900">
                  {TITRES[q.etape] ?? q.etape}
                  <span className="block font-normal text-neutral-700">
                    n = {q.n} réponses, sur {q.concernes} parcours concernés
                  </span>
                </caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Réponse</th>
                    <th scope="col">Effectif</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(q.parOption).map(([opt, n]) => (
                    <tr key={opt}>
                      <th scope="row" className="py-1 text-left font-normal text-neutral-800">
                        {T.questions[q.etape].options[opt] ?? opt}
                      </th>
                      <td className="w-12 py-1 text-right font-mono tabular-nums text-neutral-900">{n}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="py-1 text-left font-normal italic text-neutral-700">
                      non répondue
                    </th>
                    <td className="w-12 py-1 text-right font-mono tabular-nums text-neutral-900">
                      {q.concernes - q.n}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className={H2}>Q5. Reconnaissance des noms</h2>
        <p className="mb-3 text-sm text-neutral-700">
          Chaque nom n’est compté que parmi les répondants à qui il a été proposé : la version néerlandaise ne
          propose ni Le Signal ni le Stuut du jour.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th scope="col" className="py-1 pr-4">Nom</th>
                <th scope="col" className="py-1 pr-4">{T.q5Etats.inconnu}</th>
                <th scope="col" className="py-1 pr-4">{T.q5Etats.connu}</th>
                <th scope="col" className="py-1 pr-4">{T.q5Etats.utilise}</th>
                <th scope="col" className="py-1 pr-4">non répondue</th>
                <th scope="col" className="py-1">n</th>
              </tr>
            </thead>
            <tbody>
              {s.q5.map((l) => (
                <tr key={l.nom} className="border-t border-neutral-200">
                  <th scope="row" className="py-1 pr-4 text-left font-normal">
                    {T.q5Noms[l.nom as keyof typeof T.q5Noms] ?? l.nom}
                    {l.langues.length === 1 && (
                      <span className="text-neutral-600"> ({l.langues[0].toUpperCase()} seulement)</span>
                    )}
                  </th>
                  <td className="py-1 pr-4 font-mono tabular-nums">{l.parEtat.inconnu}</td>
                  <td className="py-1 pr-4 font-mono tabular-nums">{l.parEtat.connu}</td>
                  <td className="py-1 pr-4 font-mono tabular-nums">{l.parEtat.utilise}</td>
                  <td className="py-1 pr-4 font-mono tabular-nums">{l.concernes - l.n}</td>
                  <td className="py-1 font-mono tabular-nums">{l.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className={H2}>Q8. Verbatims</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {(
            [
              ['Citables (autorisation donnée)', s.verbatims.citables],
              ['Non citables', s.verbatims.nonCitables],
            ] as const
          ).map(([titre, liste]) => (
            <div key={titre}>
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">
                {titre} (n = {liste.length})
              </h3>
              {liste.length === 0 ? (
                <p className="text-sm italic text-neutral-600">Aucun.</p>
              ) : (
                <ul className="space-y-2 text-sm text-neutral-800">
                  {liste.map((v, i) => (
                    <li key={i} className="rounded border border-neutral-200 px-3 py-2">
                      {v}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        {s.autres.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">Précisions « autre » (Q1b, Q7)</h3>
            <ul className="space-y-1 text-sm text-neutral-800">
              {s.autres.map((a, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">{a.etape}</span> {a.texte}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className={H2}>Q9. Volontaires pour un échange ({entretiens.length})</h2>
        <p className="mb-3 text-sm text-neutral-700">
          Seule vue qui affiche des coordonnées (adresse e-mail et/ou téléphone). Aucun lien avec les réponses. À supprimer après les échanges, au plus
          tard le {FIN_CONSERVATION_ENTRETIENS} (purge ci-dessous).
        </p>
        {entretiens.length === 0 ? (
          <p className="text-sm italic text-neutral-600">Aucun volontaire.</p>
        ) : (
          <table className="text-sm">
            <thead>
              <tr className="text-left">
                <th scope="col" className="py-1 pr-6">Adresse</th>
                <th scope="col" className="py-1 pr-6">Téléphone</th>
                <th scope="col" className="py-1 pr-6">Langue</th>
                <th scope="col" className="py-1 pr-6">Jour</th>
                <th scope="col" className="py-1">Statut</th>
              </tr>
            </thead>
            <tbody>
              {entretiens.map((e, i) => (
                <tr key={i} className="border-t border-neutral-200">
                  <td className="py-1 pr-6 font-mono">{e.email ?? 'aucune'}</td>
                  <td className="py-1 pr-6 font-mono">{e.telephone ?? 'aucun'}</td>
                  <td className="py-1 pr-6">{e.langue}</td>
                  <td className="py-1 pr-6">{e.cree_le}</td>
                  <td className="py-1">{e.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-12">
        <h2 className={H2}>Exports CSV</h2>
        <div className="flex flex-wrap gap-3">
          <form method="post" action="/api/admin/sondage/export-reponses">
            <button type="submit" className={BOUTON}>
              Exporter les réponses (sans adresse)
            </button>
          </form>
          <form method="post" action="/api/admin/sondage/export-entretiens">
            <button type="submit" className={BOUTON}>
              Exporter les volontaires (coordonnées)
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className={H2}>Purge</h2>
        <p className="mb-3 max-w-3xl text-sm text-neutral-700">
          Vide la liste des volontaires (à faire après les échanges, au plus tard le {FIN_CONSERVATION_ENTRETIENS}).
          Supprime aussi les réponses, mais seulement après le {FIN_CONSERVATION_REPONSES} : exporter d’abord les
          résultats agrégés. Puis VACUUM, pour que rien ne reste lisible dans le fichier. Irréversible ; les
          sauvegardes gardent une copie jusqu’à leur rotation.
        </p>
        <form method="post" action="/api/admin/sondage/purge" className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-neutral-900">
            Tapez {CONFIRMATION_PURGE} pour confirmer
            <input
              name="confirmation"
              type="text"
              autoComplete="off"
              required
              className="mt-1 block rounded-md border border-neutral-500 px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" className={BOUTON}>
            Purger
          </button>
        </form>
      </section>
    </div>
  );
}
