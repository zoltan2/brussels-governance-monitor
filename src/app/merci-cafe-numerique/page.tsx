// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Image from 'next/image';
import Link from 'next/link';
import { ContactForm } from './contact-form';

const DOSSIERS = [
  {
    title: 'BIFFF : où loge la culture bruxelloise',
    tag: 'Culture',
    status: 'En cours',
    href: '/fr/dossiers/bifff',
  },
  {
    title: 'LEZ : maintenue avec pass annuel et amendes réduites',
    tag: 'Mobilité',
    status: 'En cours',
    href: '/fr/dossiers/lez',
  },
  {
    title: "Petite enfance : crèches, listes d'attente et triple autorité",
    tag: 'Social',
    status: 'Enlisé',
    href: '/fr/dossiers/petite-enfance',
  },
  {
    title: "Enseignement : l'impact des économies FWB et VG",
    tag: 'Éducation',
    status: 'En cours',
    href: '/fr/dossiers/enseignement',
  },
  {
    title: 'PFAS : contamination des sols et des eaux',
    tag: 'Santé',
    status: 'En cours',
    href: '/fr/dossiers/pfas',
  },
  {
    title: 'Data Centers & IA : impact énergétique',
    tag: 'Numérique',
    status: 'En cours',
    href: '/fr/dossiers/data-centers-ia-energie',
  },
] as const;

const RESOURCES = [
  {
    title: 'Le Signal',
    subtitle: 'Newsletter FR · 8 éditions',
    href: 'https://www.linkedin.com/newsletters/le-signal-bgm-7430513857359527936/',
    external: true,
  },
  {
    title: 'Le Briefing BGM',
    subtitle: 'Podcast FR et NL · 6 épisodes',
    href: 'https://podcast.governance.brussels',
    external: true,
  },
  {
    title: 'La Lasagne',
    subtitle: 'Précommande sans engagement',
    href: '/livre',
    external: false,
    image: '/livre/cover-homepage.webp',
  },
  {
    title: 'Le quiz',
    subtitle: '10 questions',
    href: '/fr/quiz',
    external: false,
  },
] as const;

const STATUS_STYLES: Record<string, string> = {
  'En cours': 'bg-[#1B3A6B]/10 text-[#1B3A6B]',
  'Enlisé': 'bg-amber-100 text-amber-800',
};

export default function MerciCafeNumeriquePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {/* 1 — En-tête */}
      <section className="text-center">
        <p className="text-xs font-medium tracking-wide text-[#1B3A6B]/70 uppercase">
          Café Numérique · Bruxelles · 13 avril 2026
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1B3A6B] sm:text-4xl md:text-5xl">
          Merci d&rsquo;être venu ce soir.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#1A2744] sm:text-lg">
          Tout ce dont on a parlé, en un seul endroit. Explorez, abonnez-vous,
          ou écrivez-moi.
        </p>
      </section>

      {/* 2 — Ressources gratuites */}
      <section className="mt-12 sm:mt-16">
        <h2 className="text-xl font-bold text-[#1B3A6B] sm:text-2xl">
          Ressources gratuites
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {RESOURCES.map((resource) => {
            const cardClass =
              'group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1B3A6B]/30 hover:shadow-md';
            const body = (
              <>
                {'image' in resource && resource.image && (
                  <div className="relative h-40 w-full overflow-hidden bg-[#F7F8FC]">
                    <Image
                      src={resource.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-base font-bold text-[#1B3A6B] sm:text-lg">
                    {resource.title}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {resource.subtitle}
                  </p>
                  <p className="mt-4 text-sm font-medium text-[#1B3A6B] group-hover:text-[#F2A900]">
                    Ouvrir &rarr;
                  </p>
                </div>
              </>
            );
            return resource.external ? (
              <a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
              >
                {body}
              </a>
            ) : (
              <Link key={resource.title} href={resource.href} className={cardClass}>
                {body}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3 — Dossiers phares */}
      <section className="mt-12 sm:mt-16">
        <h2 className="text-xl font-bold text-[#1B3A6B] sm:text-2xl">
          Dossiers phares
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DOSSIERS.map((dossier) => (
            <Link
              key={dossier.href}
              href={dossier.href}
              className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1B3A6B]/30 hover:shadow-md sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700">
                  {dossier.tag}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    STATUS_STYLES[dossier.status] ?? 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {dossier.status}
                </span>
              </div>
              <p className="mt-3 text-base font-semibold leading-snug text-[#1A2744] group-hover:text-[#1B3A6B]">
                {dossier.title}
              </p>
              <p className="mt-3 text-xs font-medium text-[#1B3A6B] group-hover:text-[#F2A900]">
                Lire le dossier &rarr;
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/fr/dossiers"
            className="inline-flex min-h-[44px] items-center rounded-md border border-[#1B3A6B] px-5 py-2.5 text-sm font-semibold text-[#1B3A6B] transition-colors hover:bg-[#1B3A6B] hover:text-white"
          >
            Voir les 22 dossiers &rarr;
          </Link>
        </div>
      </section>

      {/* 4 — Digest multilingue */}
      <section className="mt-12 sm:mt-16">
        <div className="rounded-2xl bg-[#1B3A6B] px-6 py-10 text-center text-white sm:px-10">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {['FR', 'NL', 'EN', 'DE'].map((code) => (
              <span
                key={code}
                className="inline-flex h-10 min-w-[48px] items-center justify-center rounded-md border border-white/25 bg-white/10 px-3 text-sm font-bold tracking-wider text-white sm:h-12 sm:min-w-[56px] sm:text-base"
              >
                {code}
              </span>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed sm:text-lg">
            BGM surveille Bruxelles en 4 langues. 323 sources. 13 domaines.
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/fr/subscribe"
              className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-[#F2A900] px-5 py-3 text-sm font-bold text-[#0F2140] transition-colors hover:bg-[#F2A900]/90"
            >
              Recevoir le digest par email
            </Link>
            <Link
              href="/digest"
              className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-white/40 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Explorer le digest en ligne
            </Link>
          </div>
        </div>
      </section>

      {/* 5 — Transparence */}
      <section className="mt-12 sm:mt-16">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#1B3A6B] sm:text-2xl">
            Vous savez maintenant ce que je surveille. Voici comment.
          </h2>
          <ul className="mt-5 space-y-4">
            <li className="border-l-4 border-[#F2A900] pl-4">
              <p className="text-sm font-semibold text-[#1B3A6B]">Sources</p>
              <p className="mt-1 text-sm text-[#1A2744]">
                323 sources, toutes listées, aucune anonyme.
              </p>
            </li>
            <li className="border-l-4 border-[#F2A900] pl-4">
              <p className="text-sm font-semibold text-[#1B3A6B]">IA</p>
              <p className="mt-1 text-sm text-[#1A2744]">
                Anthropic API, usage documenté, responsabilité éditoriale
                humaine.
              </p>
            </li>
            <li className="border-l-4 border-[#F2A900] pl-4">
              <p className="text-sm font-semibold text-[#1B3A6B]">
                Financement
              </p>
              <p className="mt-1 text-sm text-[#1A2744]">
                Zéro pub, zéro subvention, zéro affiliation. Modèle B2B.
              </p>
            </li>
          </ul>
          <div className="mt-6">
            <Link
              href="/fr/transparency"
              className="inline-flex min-h-[44px] items-center rounded-md border border-[#1B3A6B] px-5 py-2.5 text-sm font-semibold text-[#1B3A6B] transition-colors hover:bg-[#1B3A6B] hover:text-white"
            >
              Lire la page transparence complète &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 6 — Méthode transposable */}
      <section className="mt-12 sm:mt-16">
        <h2 className="text-xl font-bold text-[#1B3A6B] sm:text-2xl">
          Bruxelles d&rsquo;abord. Mais la méthode est transposable.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-[#1A2744]">
          BGM documente une gouvernance complexe, multilingue,
          multi-institutionnelle. Bruxelles est le cas le plus difficile.
          Liège, Anvers, Charleroi — ou toute ville exposée à des décisions
          publiques opaques — pourraient bénéficier du même outil. Si vous
          représentez une collectivité, une institution, un média ou une
          initiative citoyenne ailleurs en Belgique ou en Europe, parlons-en.
        </p>
        <div className="mt-6">
          <a
            href="#contact"
            className="inline-flex min-h-[48px] items-center rounded-md bg-[#1B3A6B] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0F2140]"
          >
            Discutons-en &darr;
          </a>
        </div>
      </section>

      {/* 7 — Contact */}
      <section id="contact" className="mt-12 scroll-mt-4 sm:mt-16">
        <div className="rounded-2xl bg-[#0F2140] px-6 py-10 text-white sm:px-10 sm:py-12">
          <h2 className="text-xl font-bold leading-tight sm:text-2xl">
            Vous travaillez dans un cabinet, une institution ou une entreprise
            exposée aux décisions bruxelloises&nbsp;?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Je propose un monitoring personnalisé&nbsp;: ne plus jamais manquer
            une décision qui vous concerne.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
