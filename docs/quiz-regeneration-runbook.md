# Régénération du quiz en mode manuel — runbook

Procédure reprenable par n'importe quelle session, sans contexte préalable.
**Tout l'état vit dans le dépôt**, pas dans une conversation : `npm run quiz:status` dit toujours où on en est.

---

## Pourquoi ce mode existe

La génération passe normalement par `scripts/generate-quiz.ts`, qui appelle l'API Anthropic. Ce chemin reste valable, mais il consomme des crédits et **le solde a été épuisé le 5 août 2026**. Le mode manuel applique au quiz la même logique que la veille quotidienne : l'analyse est produite en session par l'assistant, sans appel facturé, puis validée et fusionnée par un script.

Les deux chemins écrivent le même format et passent les mêmes contrôles. Ils se distinguent uniquement par le champ `provenance.model`.

---

## La boucle, en quatre commandes

```bash
# 1. Où en est-on ?
npm run quiz:status

# 2. Préparer un lot (petit, pour qu'une interruption ne coûte rien)
npm run quiz:manual:dump -- --locale fr --type domain --limit 4
#    → écrit .quiz-pending/units-fr.json et annonce le reste à faire

# 3. Lire .quiz-pending/units-fr.json, rédiger les questions dans
#    .quiz-pending/questions-fr.json  (format ci-dessous)

# 4. Valider, estampiller, fusionner
npm run quiz:manual:apply -- --locale fr

# 5. Committer le lot AVANT d'enchaîner
git add public/quiz-data-fr.json && git commit -m "content(quiz): lot ..."
```

L'étape 5 n'est pas optionnelle. Le 5 août 2026, une régénération ratée a écrasé un pool non commité et le travail a été perdu. Un lot appliqué mais non commité est un lot en sursis.

---

## Format attendu

`.quiz-pending/questions-{locale}.json` est un tableau plat. L'ordre à l'intérieur d'une même unité détermine l'index de l'identifiant.

```jsonc
[
  {
    "unitKey": "domain-budget",     // repris tel quel du dump
    "domain": "Budget",             // libellé affiché, dans la langue de la locale
    "question": "…",
    "options": ["…", "…", "…", "…"],
    "correct": 0,                   // index dans options
    "explanation": "…"              // 1 à 2 phrases, affichées APRÈS la réponse
  }
]
```

Le script attribue lui-même `id`, `source`, `sourceSlug`, `sourceTitle` et toute la `provenance`. Ne pas les écrire à la main.

---

## Ce que l'apply refuse

Le lot entier est rejeté, jamais appliqué à moitié, si :

- une `unitKey` ne figure pas dans le dump
- le nombre de questions d'une unité ne correspond pas à son `quota`
- une question n'a pas exactement quatre options, ou un `correct` hors bornes
- deux options sont identiques, ou un champ est vide
- une **fuite de réponse** est détectée : bonne option nettement plus longue que les autres, ou seule à contenir un chiffre

Un pool dont la taille tomberait sous la moitié de l'existant n'est pas écrit non plus.

---

## Règles de rédaction

Elles reprennent le prompt v2 de `scripts/generate-quiz.ts`, à garder synchronisées si l'un des deux change.

- une question porte sur **un fait différent** de l'unité
- privilégier les **mécanismes, structures et institutions** ; éviter les valeurs volatiles
- **longueur comparable** entre les quatre options, une bonne réponse plus détaillée se repère sans réfléchir
- **parité des chiffres** : si la bonne réponse contient un chiffre, une date ou un montant, au moins deux distracteurs doivent en contenir un aussi
- distracteurs plausibles, jamais absurdes
- **aucune formulation temporelle relative** : pas de « actuel », « actuellement », « récemment », « bientôt », « prochainement », « à venir ». Dater explicitement
- **aucun nom de personne politique**, uniquement les rôles institutionnels
- **terminologie belge** : bourgmestre, commune ou maison communale, échevin, tram
- l'explication éclaire la réponse et donne envie de lire la fiche source

---

## Ordre de travail recommandé

1. **Français d'abord**, langue source de tout le site. 13 cartes domaine à 2 questions, puis 32 dossiers à 1 ou 2.
2. **Puis les trois autres langues par traduction** des questions françaises validées, plutôt qu'en repartant des fiches traduites. Les fiches sont des traductions les unes des autres, donc les faits sont identiques, et cet ordre apporte une chose que les pools n'ont jamais eue : la **parité entre langues**, mêmes identifiants et mêmes faits partout. Le pool français comptait 57 questions et l'allemand 53, sans que personne ne sache lesquelles manquaient.

---

## Après une régénération complète

Les questions neuves ne sont **pas relues**. Deux conséquences :

- `data/quiz-review-state.json` ne les couvre pas, `npm run quiz:status` affiche la chute du taux de relecture
- au sens de l'**article 50 du règlement (UE) 2024/1689**, applicable depuis le 2 août 2026, du contenu généré et non relu doit porter une mention. Soit les questions sont relues et approuvées, soit le quiz porte une mention le temps de la relecture

C'est le moment où la page de relecture admin cesse d'être un confort.

---

## En cas de doute sur l'état

```bash
npm run quiz:status        # fraîcheur, relecture, unités à régénérer, par langue
npm run quiz:lint          # structure, phrases interdites, fuites de réponse
git log --oneline -- public/quiz-data-fr.json
```

Ces trois commandes suffisent à reconstruire la situation sans aucun historique de conversation.
