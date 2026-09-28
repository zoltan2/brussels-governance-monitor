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
 * Les attributs du traceur sont tous nécessaires : sans `data-host-url`,
 * il poste à l'origine par défaut et se tait sans erreur ; sans `data-domains`,
 * le développement local et la CI pollueraient les statistiques.
 *
 * `data-performance="true"` (28/09/2026) : sans lui, le traceur ne mesure aucun
 * Web Vital. Vérifié dans le script servi par /u/script.js (SHA-256 be444c28…) :
 * `A=T("performance")==="true"` active les observateurs LCP, CLS, INP, puis un
 * envoi de type `"performance"` au même `/u/api/send` (donc `connect-src 'self'`
 * suffit) et par le même crochet `before-send`, qui nettoie l'URL comme pour une
 * vue. Avant cet attribut, la base comptait zéro mesure LCP, INP, CLS, TTFB ou
 * FCP sur 60 jours.
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
        data-performance="true"
      />
    </>
  );
}
