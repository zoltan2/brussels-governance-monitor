// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Textes du sondage lecteurs, en français et en néerlandais seulement.
 *
 * FRANÇAIS : texte de la V3 validé MOT POUR MOT par Zoltán le 30/09/2026 (spec
 * bgm-ops 2026-09-25-sondage-lecteurs-design.md, § 13). Ne pas reformuler une
 * question : les réponses déjà reçues ne seraient plus comparables.
 * NÉERLANDAIS : traduction de ce texte, vouvoiement « u » comme le site ; les
 * noms des rendez-vous reprennent ceux de messages/nl.json (« het magazine »,
 * « de vraag van de dag »…). Q5 n'y propose ni « Le Signal » (français
 * seulement) ni le Stuut du jour (absent en néerlandais) : décision du
 * 30/09/2026, liste par langue dans questionnaire.ts (Q5_NOMS_PAR_LANGUE).
 *
 * Pourquoi un module et pas messages/*.json : le sondage n'existe ni en anglais
 * ni en allemand, et les dictionnaires doivent porter les quatre langues.
 *
 * La durée annoncée à l'accueil (« Environ [durée mesurée au pilote] minutes »)
 * n'est pas connue avant le pilote : DUREE_ANNONCEE_MINUTES reste `null`, et la
 * phrase n'est pas affichée, plutôt que d'annoncer un chiffre inventé.
 */

import type { EtapeChoix, EtatQ5, LangueSondage, NomQ5 } from './questionnaire';

/** À remplir après le pilote (durée médiane mesurée), en minutes entières. */
export const DUREE_ANNONCEE_MINUTES: number | null = null;

type TextesQuestion = { question: string; note?: string; options: Record<string, string> };

export interface TextesSondage {
  titrePage: string;
  accueilTitre: string;
  accueilParagraphe1: (duree: number | null) => string;
  accueilParagraphe2: string;
  lienNotice: string;
  commencer: string;
  suivant: string;
  precedent: string;
  terminer: string;
  envoi: string;
  progression: (n: number, total: number) => string;
  facultatif: string;
  precisez: string;
  questions: Record<EtapeChoix, TextesQuestion>;
  q5Question: string;
  /** Libellés des noms de Q5 proposés dans cette langue (Q5_NOMS_PAR_LANGUE), pas un de plus. */
  q5Noms: Partial<Record<NomQ5, string>>;
  q5Etats: Record<EtatQ5, string>;
  q8Question: string;
  q8Compteur: (n: number, max: number) => string;
  q8Limite: string;
  q8Citation: string;
  q8CitationOptions: { oui: string; non: string };
  q9Coordonnees: string;
  q9Aide: string;
  q9Email: string;
  q9Telephone: string;
  finTitre: string;
  finTexte: string;
  dejaRepondu: string;
  closTitre: string;
  closTexte: string;
  pasOuvertTitre: string;
  indisponible: string;
  pilote: string;
  erreurObligatoire: string;
  erreurContactVide: string;
  erreurEmailInvalide: string;
  erreurTelephoneInvalide: string;
  erreurEnregistrement: string;
  erreurTropDeRequetes: string;
  erreurSession: string;
  champPiege: string;
}

const fr: TextesSondage = {
  titrePage: 'Sondage lecteurs',
  accueilTitre: 'Dix questions sur le digest',
  accueilParagraphe1: (duree) =>
    'Le digest existe depuis février 2026. Dix questions pour savoir ce qu\'il vous apporte et ce que nous devons changer. Les critiques nous aident plus que les compliments.' +
    (duree ? ` Environ ${duree} minutes.` : ''),
  accueilParagraphe2:
    'Vos réponses sont anonymes : nous ne demandons vos coordonnées qu\'à la dernière question, si vous acceptez un échange. Nous les conservons jusqu\'au 6 décembre 2027, puis seulement des résultats agrégés. Nous vous dirons ce que nous en retenons dans le digest du 14 décembre 2026.',
  lienNotice: 'Comment vos réponses sont traitées',
  commencer: 'Commencer',
  suivant: 'Suivant',
  precedent: 'Précédent',
  terminer: 'Terminer',
  envoi: 'Enregistrement…',
  progression: (n, total) => `Question ${n} sur ${total}`,
  facultatif: 'Facultatif.',
  precisez: 'Précisez (facultatif)',
  questions: {
    q1: {
      question: 'En général, quand le digest arrive, vous l\'ouvrez…',
      note: 'Vous ne le recevez pas les semaines où rien ne change sur vos thèmes.',
      options: {
        toujours: 'toujours',
        souvent: 'souvent',
        parfois: 'parfois',
        rarement: 'rarement',
        jamais: 'jamais',
      },
    },
    q1b: {
      question: 'Qu\'est-ce qui vous en empêche surtout ?',
      options: {
        trop_long: 'il est trop long',
        mauvais_moment: 'il arrive au mauvais moment',
        sujets: 'les sujets ne me concernent pas assez',
        trop_newsletters: 'je reçois trop de newsletters',
        habitude: 'j\'ai perdu l\'habitude',
        autre: 'autre',
      },
    },
    q2: {
      question: 'Si le digest disparaissait demain…',
      options: {
        manquerait: 'il me manquerait vraiment',
        regrettable: 'je trouverais cela regrettable',
        autre_chose: 'je passerais assez vite à autre chose',
        pas_remarque: 'je ne le remarquerais probablement pas',
      },
    },
    q3: {
      question: 'Quand vous l\'ouvrez, combien de liens ouvrez-vous en général ?',
      options: {
        aucun: 'aucun, l\'email me suffit',
        un: 'un',
        deux_trois: 'deux ou trois',
        plus_de_trois: 'plus de trois',
      },
    },
    q4: {
      question: 'En dehors des liens du digest, vous arrive-t-il d\'aller sur governance.brussels ?',
      options: {
        souvent: 'souvent',
        de_temps_en_temps: 'de temps en temps',
        rarement: 'rarement',
        jamais: 'jamais',
      },
    },
    q4a: {
      question: 'Qu\'y cherchez-vous le plus souvent ?',
      options: {
        sujet: 'un sujet précis',
        cette_semaine: 'ce qui a changé cette semaine',
        commune: 'une commune',
        chiffres: 'des chiffres',
        verification: 'une vérification ou une source',
        autre: 'autre',
      },
    },
    q4b: {
      question: 'Qu\'est-ce qui vous en retient ?',
      options: {
        digest_suffit: 'le digest me suffit',
        temps: 'le temps',
        sais_pas: 'je ne sais pas ce que j\'y trouverais',
        pas_convaincu: 'le site ne m\'a pas convaincu',
        autre: 'autre',
      },
    },
    q6a: {
      question: 'Avez-vous déjà écouté le Briefing BGM, notre podcast ?',
      options: {
        plusieurs: 'oui, plusieurs fois',
        une_deux: 'une ou deux fois',
        connu: 'non, mais je le connaissais',
        inconnu: 'non, je ne le connaissais pas',
      },
    },
    q6b: {
      question: 'Il est en pause depuis avril 2026. Si nous le reprenions, vous l\'écouteriez…',
      options: {
        surement: 'sûrement',
        peut_etre: 'peut-être',
        probablement_pas: 'probablement pas',
        pas_podcasts: 'je n\'écoute pas de podcasts',
      },
    },
    q7: {
      question: 'Si nous ne changions qu\'une chose au digest, laquelle serait la plus utile pour vous ?',
      options: {
        plus_court: 'plus court',
        consequences: 'les conséquences concrètes pour les Bruxellois',
        responsables: 'les responsables et les prochaines échéances',
        suite: 'la suite des sujets des semaines précédentes',
        liens: 'des liens plus visibles vers le site',
        rien: 'rien, il me convient',
        autre: 'autre',
      },
    },
    q9: {
      question:
        'Accepteriez-vous un échange de quinze minutes, par téléphone ou en visio ? Zoltán Jánosi, qui édite BGM, vous contactera pour fixer un moment. Aucune sollicitation commerciale.',
      options: { oui: 'oui', non: 'pas cette fois' },
    },
  },
  q5Question: 'Reconnaissez-vous ces noms ?',
  q5Noms: {
    magazine: 'Le Magazine',
    signal: 'Le Signal',
    stuut: 'Le Stuut du jour',
    amai: 'Amai !',
    quiz: 'Le Quiz',
    question_du_jour: 'La question du jour',
    radar: 'Le Radar',
  },
  q5Etats: {
    inconnu: 'je ne connaissais pas',
    connu: 'je connais sans l\'utiliser',
    utilise: 'je l\'utilise',
  },
  q8Question: 'Si vous pouviez changer une seule chose chez BGM, laquelle ?',
  q8Compteur: (n, max) => `${n} / ${max} caractères`,
  q8Limite: 'Limite de 200 caractères atteinte.',
  q8Citation: 'Pouvons-nous citer cette réponse, sans votre nom, dans le digest ou sur le site ?',
  q8CitationOptions: { oui: 'oui', non: 'non' },
  q9Coordonnees: 'Vos coordonnées',
  q9Aide:
    'Indiquez au moins l\'une des deux. Ce sont les seules données personnelles du questionnaire. Nous les conservons jusqu\'à l\'échange, et au plus tard jusqu\'au 6 décembre 2026.',
  q9Email: 'Votre adresse e-mail',
  q9Telephone: 'Votre numéro de téléphone',
  finTitre: 'Merci, vos réponses sont enregistrées.',
  finTexte: 'Nous vous dirons ce que nous en retenons dans le digest du 14 décembre 2026.',
  dejaRepondu: 'Vous avez déjà répondu, merci.',
  closTitre: 'Ce sondage est clos.',
  closTexte: 'Merci à celles et ceux qui ont répondu.',
  pasOuvertTitre: 'Ce sondage n\'est pas encore ouvert.',
  indisponible: 'Le sondage est momentanément indisponible. Réessayez plus tard.',
  pilote: 'Mode pilote : ces réponses sont marquées comme essai et exclues de l\'analyse.',
  erreurObligatoire: 'Choisissez une réponse pour continuer.',
  erreurContactVide:
    'Indiquez une adresse e-mail ou un numéro de téléphone, ou choisissez « pas cette fois ».',
  erreurEmailInvalide: 'Adresse e-mail invalide.',
  erreurTelephoneInvalide:
    'Numéro de téléphone invalide : de 8 à 20 chiffres, avec si besoin « + » en tête, des espaces, des points ou des tirets.',
  erreurEnregistrement: 'Votre réponse n\'a pas pu être enregistrée. Réessayez.',
  erreurTropDeRequetes: 'Trop de tentatives depuis cette connexion. Attendez une minute, puis réessayez.',
  erreurSession: 'Votre session a expiré. Le questionnaire reprend au début.',
  champPiege: 'Ne pas remplir ce champ',
};

const nl: TextesSondage = {
  titrePage: 'Lezersenquête',
  accueilTitre: 'Tien vragen over de digest',
  accueilParagraphe1: (duree) =>
    'De digest bestaat sinds februari 2026. Tien vragen om te weten wat hij u oplevert en wat we moeten veranderen. Kritiek helpt ons meer dan complimenten.' +
    (duree ? ` Ongeveer ${duree} minuten.` : ''),
  accueilParagraphe2:
    'Uw antwoorden zijn anoniem: we vragen uw contactgegevens pas bij de laatste vraag, als u instemt met een gesprek. We bewaren ze tot 6 december 2027, daarna alleen nog geaggregeerde resultaten. In de digest van 14 december 2026 vertellen we u wat we eruit meenemen.',
  lienNotice: 'Hoe uw antwoorden worden verwerkt',
  commencer: 'Beginnen',
  suivant: 'Volgende',
  precedent: 'Vorige',
  terminer: 'Afronden',
  envoi: 'Opslaan…',
  progression: (n, total) => `Vraag ${n} van ${total}`,
  facultatif: 'Optioneel.',
  precisez: 'Licht toe (optioneel)',
  questions: {
    q1: {
      question: 'Wanneer de digest binnenkomt, opent u hem doorgaans…',
      note: 'U ontvangt hem niet in de weken waarin er niets verandert in uw thema\'s.',
      options: {
        toujours: 'altijd',
        souvent: 'vaak',
        parfois: 'soms',
        rarement: 'zelden',
        jamais: 'nooit',
      },
    },
    q1b: {
      question: 'Wat houdt u vooral tegen?',
      options: {
        trop_long: 'hij is te lang',
        mauvais_moment: 'hij komt op een slecht moment',
        sujets: 'de onderwerpen gaan me niet genoeg aan',
        trop_newsletters: 'ik ontvang te veel nieuwsbrieven',
        habitude: 'ik ben de gewoonte kwijtgeraakt',
        autre: 'iets anders',
      },
    },
    q2: {
      question: 'Als de digest morgen zou verdwijnen…',
      options: {
        manquerait: 'zou ik hem echt missen',
        regrettable: 'zou ik dat jammer vinden',
        autre_chose: 'zou ik vrij snel iets anders zoeken',
        pas_remarque: 'zou ik het waarschijnlijk niet merken',
      },
    },
    q3: {
      question: 'Hoeveel links opent u doorgaans wanneer u hem opent?',
      options: {
        aucun: 'geen, de e-mail volstaat',
        un: 'één',
        deux_trois: 'twee of drie',
        plus_de_trois: 'meer dan drie',
      },
    },
    q4: {
      question: 'Gaat u, los van de links in de digest, weleens naar governance.brussels?',
      options: {
        souvent: 'vaak',
        de_temps_en_temps: 'af en toe',
        rarement: 'zelden',
        jamais: 'nooit',
      },
    },
    q4a: {
      question: 'Wat zoekt u er meestal?',
      options: {
        sujet: 'een bepaald onderwerp',
        cette_semaine: 'wat er deze week veranderd is',
        commune: 'een gemeente',
        chiffres: 'cijfers',
        verification: 'een verificatie of een bron',
        autre: 'iets anders',
      },
    },
    q4b: {
      question: 'Wat houdt u daarvan tegen?',
      options: {
        digest_suffit: 'de digest volstaat voor mij',
        temps: 'tijd',
        sais_pas: 'ik weet niet wat ik er zou vinden',
        pas_convaincu: 'de site heeft me niet overtuigd',
        autre: 'iets anders',
      },
    },
    q6a: {
      question: 'Hebt u al eens naar de Briefing BGM geluisterd, onze podcast?',
      options: {
        plusieurs: 'ja, meerdere keren',
        une_deux: 'een of twee keer',
        connu: 'nee, maar ik kende hem wel',
        inconnu: 'nee, ik kende hem niet',
      },
    },
    q6b: {
      question: 'Hij ligt stil sinds april 2026. Als we hem hervatten, zou u ernaar luisteren…',
      options: {
        surement: 'zeker',
        peut_etre: 'misschien',
        probablement_pas: 'waarschijnlijk niet',
        pas_podcasts: 'ik luister niet naar podcasts',
      },
    },
    q7: {
      question: 'Als we maar één ding aan de digest zouden veranderen, wat zou dan het nuttigst zijn voor u?',
      options: {
        plus_court: 'korter',
        consequences: 'de concrete gevolgen voor de Brusselaars',
        responsables: 'de verantwoordelijken en de volgende deadlines',
        suite: 'het vervolg van de onderwerpen van de vorige weken',
        liens: 'beter zichtbare links naar de site',
        rien: 'niets, hij bevalt me zo',
        autre: 'iets anders',
      },
    },
    q9: {
      question:
        'Zou u openstaan voor een gesprek van een kwartier, telefonisch of via video? Zoltán Jánosi, die BGM uitgeeft, neemt contact met u op om een moment af te spreken. Zonder enig commercieel oogmerk.',
      options: { oui: 'ja', non: 'deze keer niet' },
    },
  },
  q5Question: 'Herkent u deze namen?',
  q5Noms: {
    magazine: 'Het magazine',
    amai: 'Amai !',
    quiz: 'De quiz',
    question_du_jour: 'De vraag van de dag',
    radar: 'De radar',
  },
  q5Etats: {
    inconnu: 'ik kende het niet',
    connu: 'ik ken het, maar gebruik het niet',
    utilise: 'ik gebruik het',
  },
  q8Question: 'Als u één ding bij BGM zou kunnen veranderen, wat zou dat zijn?',
  q8Compteur: (n, max) => `${n} / ${max} tekens`,
  q8Limite: 'Limiet van 200 tekens bereikt.',
  q8Citation: 'Mogen we dit antwoord, zonder uw naam, citeren in de digest of op de site?',
  q8CitationOptions: { oui: 'ja', non: 'nee' },
  q9Coordonnees: 'Uw contactgegevens',
  q9Aide:
    'Vul ten minste een van beide in. Dit zijn de enige persoonsgegevens van de vragenlijst. We bewaren ze tot het gesprek, en uiterlijk tot 6 december 2026.',
  q9Email: 'Uw e-mailadres',
  q9Telephone: 'Uw telefoonnummer',
  finTitre: 'Bedankt, uw antwoorden zijn opgeslagen.',
  finTexte: 'In de digest van 14 december 2026 vertellen we u wat we eruit meenemen.',
  dejaRepondu: 'U hebt al geantwoord, bedankt.',
  closTitre: 'Deze enquête is afgesloten.',
  closTexte: 'Bedankt aan iedereen die heeft geantwoord.',
  pasOuvertTitre: 'Deze enquête is nog niet geopend.',
  indisponible: 'De enquête is tijdelijk niet beschikbaar. Probeer het later opnieuw.',
  pilote: 'Pilotmodus: deze antwoorden worden als test gemarkeerd en niet meegeteld in de analyse.',
  erreurObligatoire: 'Kies een antwoord om verder te gaan.',
  erreurContactVide: 'Vul een e-mailadres of een telefoonnummer in, of kies ‘deze keer niet’.',
  erreurEmailInvalide: 'Ongeldig e-mailadres.',
  erreurTelephoneInvalide:
    'Ongeldig telefoonnummer: 8 tot 20 cijfers, zo nodig met ‘+’ vooraan, spaties, punten of streepjes.',
  erreurEnregistrement: 'Uw antwoord kon niet worden opgeslagen. Probeer het opnieuw.',
  erreurTropDeRequetes: 'Te veel pogingen vanaf deze verbinding. Wacht een minuut en probeer het dan opnieuw.',
  erreurSession: 'Uw sessie is verlopen. De vragenlijst begint opnieuw.',
  champPiege: 'Dit veld niet invullen',
};

export const TEXTES: Record<LangueSondage, TextesSondage> = { fr, nl };
