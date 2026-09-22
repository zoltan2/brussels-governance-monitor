import { UMAMI_BEFORE_SEND, UMAMI_BEFORE_SEND_SCRIPT } from '@/lib/umami-before-send';

/**
 * Le seul endroit du dépôt qui charge le traceur Umami, verrouillé par
 * `src/lib/analytics-host.test.ts`.
 *
 * Avant le 22/09/2026, le bloc était recopié dans quatre layouts, et la
 * protection des jetons d'abonné (l'attribut `exclude-search`) n'était posée que sur
 * deux d'entre eux. Un composant unique empêche qu'une copie dérive.
 *
 * Ordre obligatoire : le script en ligne définit le filtre AVANT le traceur, qui
 * est différé (`defer`). Si le filtre manquait, le traceur enverrait l'URL
 * complète, jetons compris : c'est pourquoi les deux balises vivent ensemble ici.
 * Voir `src/lib/umami-before-send.ts` pour le filtre lui-même.
 *
 * Les cinq attributs du traceur sont tous nécessaires : sans `data-host-url`,
 * il poste à l'origine par défaut et se tait sans erreur ; sans `data-domains`,
 * le développement local et la CI pollueraient les statistiques.
 */
export function UmamiScript() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!websiteId) return null;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: UMAMI_BEFORE_SEND_SCRIPT }} />
      <script
        defer
        src="/u/script.js"
        data-website-id={websiteId}
        data-host-url="https://governance.brussels/u"
        data-domains="governance.brussels"
        data-before-send={UMAMI_BEFORE_SEND}
      />
    </>
  );
}
