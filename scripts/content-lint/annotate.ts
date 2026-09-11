/**
 * Sorties partagées des gardes content-lint.
 *
 * `annotate` écrit une annotation GitHub Actions (::error title=…::…) : c'est
 * ce que /fr/admin lit pour dire POURQUOI un contrôle a échoué
 * (src/lib/github-pr.ts, readFailureNotes). Hors Actions, rien n'est écrit.
 * Équivalent shell : gh_annotate dans lib.sh.
 *
 * `safeLine` neutralise un texte venu du contenu avant de l'écrire au journal :
 * un retour à la ligne suivi de « :: » y deviendrait une commande de workflow
 * (::stop-commands::, fausse ::error), démontré par la red team le 2026-09-11
 * avec une question de FAQ piégée.
 */
const escData = (v: string) => v.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escProp = (v: string) => escData(v).replace(/:/g, '%3A').replace(/,/g, '%2C');

export function annotate(title: string, message: string, file?: string): void {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  const fileProp = file ? `file=${escProp(file)},` : '';
  console.log(`::error ${fileProp}title=${escProp(title)}::${escData(message)}`);
}

/** Texte sur une seule ligne, sans séquence « :: » en tête. */
export function safeLine(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(/^\s*::/, ' ::');
}
