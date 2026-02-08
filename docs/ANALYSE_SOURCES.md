# ANALYSE SOURCES — Brussels Governance Monitor

**Date :** 2026-02-08
**Analyste :** Claude (Opus 4.6)
**Version :** v1.0
**Périmètre :** Normalisation sources V1-V5, analyse des gaps, proposition médias multilingues

---

## A) LISTE NORMALISEE DES SOURCES EXISTANTES

### Source Registry (watch cron) — 18 sources

| # | ID | Nom source | URL canonique | Langue | Type | Couverture | Utilité BGM (0-5) | Note |
|---|-----|-----------|--------------|--------|------|-----------|-------------------|------|
| 1 | watch-001 | Actiris | actiris.brussels/fr/citoyens/ | FR | institutional | emploi BXL | **5** | Source primaire emploi, chiffres chômage |
| 2 | watch-002 | Parlement bruxellois | parlement.brussels/seances-plenieres/ | FR | institutional | governance | **5** | Votes, ordonnances, questions |
| 3 | watch-003 | COCOM/GGC | ccc-ggc.brussels/fr/news | FR | institutional | social | **5** | Décisions bi-communautaires |
| 4 | watch-004 | Iriscare | iriscare.brussels/fr/publications/ | FR | institutional | social | **4** | Rapports secteur santé/social |
| 5 | watch-005 | Bruxelles Environnement | environnement.brussels/actualites | FR | institutional | climat | **4** | Plan climat, Renolution, qualité air |
| 6 | watch-006 | STIB/MIVB | stib-mivb.be | FR | institutional | mobilité | **4** | Réseau transport, fréquentation, métro 3 |
| 7 | watch-007 | Bruxelles Mobilité | mobilite-mobiliteit.brussels/fr/actualites | FR | institutional | mobilité | **4** | Good Move, pistes cyclables |
| 8 | watch-008 | Statbel | statbel.fgov.be/fr/themes/datalab/bruxelles | FR | institutional | data | **5** | PIB, population, revenus, emploi |
| 9 | watch-009 | IBSA | ibsa.brussels/publications | FR | institutional | data | **5** | Baromètre conjoncturel, mini-bru |
| 10 | watch-010 | Bruss'Help | brusshelp.org/publications | FR | institutional | social | **4** | Dénombrements sans-abri |
| 11 | watch-011 | perspective.brussels | perspective.brussels/fr/actualites-publications/publications | FR | institutional | urban | **4** | PAD, PRDD, urbanisme |
| 12 | watch-012 | Brulocalis | brulocalis.brussels/fr/actualites | FR | institutional | governance | **4** | Impact communes, CPAS |
| 13 | watch-013 | Famiris | famiris.brussels/fr/actualites/ | FR | institutional | social | **3** | Allocations familiales BXL |
| 14 | watch-014 | BX1 | bx1.be/categories/news/ | FR | press | governance | **4** | Média bruxellois de référence |
| 15 | watch-015 | RTBF | rtbf.be/en-continu?taxonomy=BRUXELLES | FR | press | governance | **3** | Média public, recoupement |
| 16 | watch-016 | Observatoire Santé et Social | ccc-ggc.brussels/fr/observatoire-de-la-sante-et-du-social/publications | FR | institutional | social | **5** | Baromètre social, pauvreté |
| 17 | watch-017 | RBC — Décisions officielles | be.brussels/a-propos-de-la-region/decisions-officielles | FR | institutional | governance | **5** | Ordonnances, arrêtés |
| 18 | watch-018 | Bruxelles Logement | logement.brussels/actualites/ | FR | institutional | housing | **4** | Loyers, logement social, primes |

### Source Log (veille traitée) — 5 entrées

| # | ID | Source | URL | Verdict | Confiance | Cartes affectées |
|---|-----|--------|-----|---------|-----------|-----------------|
| 1 | src-001 | Actiris | actiris.brussels | fiable | official | employment |
| 2 | src-002 | Statbel | statbel.fgov.be | fiable | official | budget, employment-response |
| 3 | src-003 | Eurostat | ec.europa.eu/eurostat | fiable | official | comparaisons internationales |
| 4 | src-004 | L'Avenir (TVA fédérale) | lavenir.net | non-retenu | unconfirmed | aucune (hors périmètre) |
| 5 | src-005 | Le Soir (allocations familiales) | lesoir.be | fiable | estimated | social, health-social |

### Diagnostic V1

**Points forts :**
- Bonne couverture institutionnelle BXL (Parlement, COCOM, IBSA, Statbel)
- Sources primaires pour les 4 domaines principaux
- Registry structuré avec fréquence et catégorie

**Points faibles identifiés :**
- 100% francophone — aucune source NL, EN, ou DE
- Aucun média d'investigation (Medor, Apache, Knack)
- Pas de sources légales (Moniteur belge, Senate)
- Pas de régulateurs sectoriels (BRUGEL, CREG)
- Pas de sources fédérales (Chambre, Sénat)
- Pas de think tanks / recherche académique
- Aucune source presse NL (VRT NWS, De Standaard, BRUZZ)
- Aucune source presse EN (Brussels Times, POLITICO, EUobserver)

---

## B) GAPS & RECOMMANDATIONS

### GAP 1 — Aucune source néerlandophone
**Gravité : CRITIQUE**
La Région bruxelloise est constitutionnellement bilingue. L'absence totale de sources NL compromet la crédibilité auprès de 10% de la population et de la VGC.

**Sources candidates :**
1. VRT NWS — vrt.be/vrtnws/nl/ (public, gratuit, 300+ journalistes)
2. BRUZZ — bruzz.be (média 100% bruxellois, trilingue)
3. De Standaard — standaard.be (quotidien de référence flamand)
4. De Tijd — tijd.be (économique, formation gouvernement)
5. Het Nieuwsblad — nieuwsblad.be (plus grand tirage flamand)

### GAP 2 — Aucune source anglophone
**Gravité : HAUTE**
Bruxelles accueille ~180 000 expats et les institutions UE. L'EN est la 3e langue de fait.

**Sources candidates :**
1. The Brussels Times — brusselstimes.com (plus grand média EN du Benelux)
2. POLITICO Europe — politico.eu (EU affairs, ~100K abonnés newsletter)
3. EUobserver — euobserver.com (non-profit, basé à Bruxelles)
4. VRT NWS English — vrt.be/vrtnws/en/ (gratuit)
5. Belga News Agency EN — belganewsagency.eu (wire service)

### GAP 3 — Aucune source germanophone
**Gravité : MOYENNE**
La Communauté germanophone est constitutionnellement reconnue. BXL a des liens institutionnels.

**Sources candidates :**
1. Grenz-Echo — grenzecho.net (unique quotidien DE de Belgique)
2. BRF — brf.be (radio-TV publique germanophone)

### GAP 4 — Pas de sources légales / Journal officiel
**Gravité : HAUTE**
Impossible de vérifier les ordonnances et arrêtés sans le Moniteur belge.

**Sources candidates :**
1. Moniteur belge — ejustice.just.fgov.be (journal officiel, gratuit)
2. Chambre (dekamer.be) — documents parlementaires fédéraux
3. Sénat (senate.be) — publications, rapports d'information
4. DroitBelge.be — actualités juridiques
5. Jubel.be — actualités juridiques NL

### GAP 5 — Pas de régulateurs sectoriels
**Gravité : HAUTE**
Les régulateurs produisent des données essentielles pour les cartes domaine.

**Sources candidates :**
1. BRUGEL — brugel.brussels (énergie + eau BXL, créé 2007)
2. CREG — creg.be (régulateur fédéral énergie)
3. IBPT — ibpt.be (télécommunications)
4. SLRB-BGHM — slrb-bghm.brussels (logement social BXL)

### GAP 6 — Pas de médias d'investigation
**Gravité : HAUTE**
L'investigation est cruciale pour détecter les dysfonctionnements institutionnels.

**Sources candidates (FR) :**
1. Medor — medor.coop (trimestriel coopératif, investigation)
2. Wilfried — wilfriedmag.be (magazine politique belge)
3. Le Vif — levif.be (hebdomadaire, enquêtes)

**Sources candidates (NL) :**
1. Apache — apache.be (investigation coopérative)
2. Knack — knack.be (hebdomadaire de référence)
3. Pano (VRT) — vrt.be/vrtmax/a-z/pano/ (documentaires TV)

### GAP 7 — Pas de think tanks / recherche
**Gravité : MOYENNE**
Les analyses de fond manquent pour contextualiser la crise.

**Sources candidates :**
1. CRISP — crisp.be (socio-politique belge, Courrier hebdomadaire)
2. Brussels Studies — journals.openedition.org/brussels/ (revue académique open access)
3. Bruegel — bruegel.org (économie EU, open access)
4. CEPS — ceps.eu (politique EU)
5. Egmont Institute — egmontinstitute.be (relations internationales belges)
6. Itinera Institute — itinerainstitute.org (réforme institutionnelle)

### GAP 8 — Pas de sources sociales / terrain
**Gravité : MOYENNE**
L'impact humain de la crise n'est pas tracé.

**Sources candidates (FR) :**
1. Alter Echos — alterechos.be (justice sociale, bimensuel)
2. Ensemble! — ensemble.be (pauvreté, CPAS, gratuit)
3. Bruxelles en mouvements (IEB) — ieb.be (urbanisme, logement, ~80 comités)
4. CBCS — cbcs.be (coordination bruxelloise d'institutions sociales)

**Sources candidates (NL) :**
1. Sociaal.Net — sociaal.net (secteur social flamand)
2. SamPol — sampol.be (analyse socio-politique)

### GAP 9 — Pas de sources économiques sectorielles
**Gravité : MOYENNE**
Les cartes secteur manquent de données économiques.

**Sources candidates :**
1. Trends-Tendances — trends.levif.be (économie FR)
2. Trends — trends.knack.be (économie NL)
3. VOKA — voka.be (employeurs flamands)
4. UNIZO — unizo.be (PME)
5. LN24 — ln24.be (chaîne info continue FR)

### GAP 10 — Pas de sources transport multimodal
**Gravité : BASSE**
STIB et Bruxelles Mobilité sont couverts, mais manque TEC et De Lijn.

**Sources candidates :**
1. De Lijn — delijn.be (bus flamands à/via BXL)
2. TEC — letec.be (bus wallons à/via BXL)
3. SNCB/NMBS — belgiantrain.be (navetteurs, RER/GEN)

### GAP 11 — Pas de sources énergie / climat
**Gravité : MOYENNE**
Bruxelles Environnement est couvert, mais pas les données énergie.

**Sources candidates :**
1. BRUGEL — brugel.brussels (tarifs énergie + eau)
2. IRCELINE — irceline.be (qualité de l'air, temps réel)
3. SIBELGA — sibelga.be (gestionnaire réseau BXL)

### GAP 12 — Pas de sources immobilier / logement privé
**Gravité : MOYENNE**
Bruxelles Logement et SLRB couvrent le logement social, mais pas le privé.

**Sources candidates :**
1. loyers.brussels — loyers de référence (grille officielle)
2. Observatoire des bureaux (CBRE/JLL) — données marché immobilier commercial
3. Notaire.be — statistiques notariales (prix immobilier)

### GAP 13 — Pas de médias communautaires / hyperlocaux
**Gravité : BASSE**
Manque la voix des quartiers.

**Sources candidates (FR) :**
1. BruxellesToday — bruxellestoday.be (19 communes)
2. Bruxelles Bondy Blog — bxlbondyblog.be (quartiers populaires)
3. Radio Air Libre — radioairlibre.be (radio associative)

**Sources candidates (NL) :**
1. StampMedia — stampmedia.be (jeunes, diversité)
2. Wonen in Brussel — woneninbrussel.be (VGC)

---

## C) LISTE MEDIA MULTILINGUE PROPOSEE

### C.1 — MEDIAS FRANCOPHONES (41 sources)

| # | Nom | URL canonique | Type | Paywall | Couverture | Utilité BGM |
|---|-----|-------------|------|---------|-----------|-------------|
| **Presse nationale** | | | | | | |
| 1 | RTBF | rtbf.be | radio-TV publique | Non | Belgique | 5 |
| 2 | RTL Info | rtlinfo.be | TV privée + web | Non | Belgique FR | 4 |
| 3 | Le Soir | lesoir.be | quotidien | Oui | Belgique/BXL | 5 |
| 4 | La Libre Belgique | lalibre.be | quotidien | Partiel | Belgique/BXL | 4 |
| 5 | L'Echo | lecho.be | quotidien éco | Oui | Belgique éco | 4 |
| 6 | La DH / Les Sports+ | dhnet.be | quotidien populaire | Partiel | Belgique/BXL | 3 |
| 7 | L'Avenir | lavenir.net | quotidien régional | Oui | Wallonie+BXL | 3 |
| **Bruxelles local** | | | | | | |
| 8 | BX1 | bx1.be | TV/web bruxellois | Non | BXL | 5 |
| 9 | BruxellesToday | bruxellestoday.be | web hyperlocal | Non | 19 communes | 3 |
| 10 | Bruxelles Korner | bruxelleskorner.com | blog/analyse | Non | BXL politique | 3 |
| 11 | Bruxelles Bondy Blog | bxlbondyblog.be | participatif | Non | quartiers populaires | 2 |
| 12 | BRUZZ | bruzz.be | multi-plateforme | Non | BXL (trilingue) | 4 |
| **Économie** | | | | | | |
| 13 | Trends-Tendances | trends.levif.be | hebdo éco | Oui | Belgique éco | 3 |
| 14 | LN24 | ln24.be | chaîne info 24h | Non | Belgique | 4 |
| 15 | 21News | 21news.be | web digital-native | Non | Belgique pol+éco | 2 |
| **Investigation / profondeur** | | | | | | |
| 16 | Medor | medor.coop | trimestriel coopératif | Partiel | Belgique investigation | 4 |
| 17 | Wilfried | wilfriedmag.be | trimestriel politique | Partiel | Belgique politique | 4 |
| 18 | Le Vif | levif.be | hebdo généraliste | Oui | Belgique | 3 |
| 19 | PAN | pan.be | hebdo satirique | Partiel | Belgique politique | 2 |
| **Agence** | | | | | | |
| 20 | Belga | belga.be | agence nationale | Oui (B2B) | Belgique | 5 |
| **Radio/TV** | | | | | | |
| 21 | La Premiere (RTBF) | rtbf.be/lapremiere | radio publique | Non | Belgique | 4 |
| 22 | VivaCite (RTBF) | rtbf.be/vivacite | radio régionale | Non | BXL | 3 |
| 23 | Bel RTL | belrtl.be | radio privée | Non | Belgique | 3 |
| **Institutionnel / politique** | | | | | | |
| 24 | CRISP | crisp.be | recherche socio-pol | Partiel | Belgique | 5 |
| 25 | Politique (revue) | revuepolitique.be | trimestriel | Partiel | Belgique analyse | 3 |
| 26 | La Revue Nouvelle | revuenouvelle.be | revue intellectuelle | Partiel | Belgique | 3 |
| 27 | Parlement bruxellois | parlement.brussels | publications officielles | Non | BXL | 5 |
| 28 | Parlement francophone BXL | parlementfrancophone.brussels | publications COCOF | Non | BXL FR | 3 |
| **Social / logement / urbanisme** | | | | | | |
| 29 | Alter Echos | alterechos.be | bimensuel social | Partiel | Belgique social | 4 |
| 30 | Brussels Studies | journals.openedition.org/brussels/ | revue académique | Non | BXL (trilingual) | 4 |
| 31 | Bruxelles en mouvements (IEB) | ieb.be | périodique urbanisme | Non | BXL urbanisme | 4 |
| 32 | Ensemble! | ensemble.be | trimestriel pauvreté | Non | BXL/Belgique | 3 |
| 33 | Le Ligueur | leligueur.be | mensuel familles | Partiel | Belgique FR | 2 |
| 34 | Brulocalis | brulocalis.brussels | assoc. communes | Non | BXL 19 communes | 3 |
| **Indépendant / alternatif** | | | | | | |
| 35 | Imagine Demain le Monde | imagine-magazine.com | bimestriel écologie | Partiel | Belgique | 2 |
| 36 | Agir par la Culture | agirparlaculture.be | semestriel culture | Non | Belgique FR | 2 |
| 37 | Kiosque | kiosque.media | collectif 7 médias | Non | portail | 2 |
| 38 | Axelle | axellemag.be | bimestriel féministe | Partiel | Belgique | 2 |
| **Juridique** | | | | | | |
| 39 | Moniteur belge | ejustice.just.fgov.be | journal officiel | Non | Belgique | 5 |
| 40 | DroitBelge.be | droitbelge.be | actualités juridiques | Non | Belgique | 3 |
| 41 | Journal des tribunaux | jt.larcier-intersentia.be | hebdo juridique | Oui | Belgique | 2 |

### C.2 — MEDIAS NEERLANDOPHONES (45 sources)

| # | Nom | URL canonique | Type | Paywall | Couverture | Utilité BGM |
|---|-----|-------------|------|---------|-----------|-------------|
| **Presse nationale** | | | | | | |
| 1 | VRT NWS | vrt.be/vrtnws/nl/ | radio-TV publique | Non | Flandre/Belgique | 5 |
| 2 | De Standaard | standaard.be | quotidien référence | Oui | Flandre/Belgique | 5 |
| 3 | De Morgen | demorgen.be | quotidien progressiste | Oui | Flandre/Belgique | 4 |
| 4 | Het Laatste Nieuws (HLN) | hln.be | quotidien populaire | Partiel | Belgique | 3 |
| 5 | De Tijd | tijd.be | quotidien éco/finance | Oui | Belgique | 4 |
| 6 | Het Nieuwsblad | nieuwsblad.be | quotidien grand tirage | Partiel | Flandre/BXL | 4 |
| 7 | Gazet van Antwerpen | gva.be | quotidien Anvers | Partiel | Flandre | 2 |
| 8 | Het Belang van Limburg | hbvl.be | quotidien Limbourg | Partiel | Flandre | 2 |
| **Bruxelles NL** | | | | | | |
| 9 | BRUZZ | bruzz.be | multi-plateforme BXL | Non | BXL | 5 |
| 10 | Wonen in Brussel | woneninbrussel.be | portail VGC | Non | BXL | 3 |
| 11 | VGC | vgc.be | institutionnel | Non | BXL NL | 4 |
| 12 | Huis van het Nederlands | huisnederlandsbrussel.be | institutionnel | Non | BXL NL | 2 |
| **Économie** | | | | | | |
| 13 | Trends | trends.knack.be | hebdo éco | Oui | Belgique | 3 |
| 14 | VOKA | voka.be | fédération employeurs | Non | Flandre/BXL | 3 |
| 15 | UNIZO | unizo.be | fédération PME | Non | Flandre/BXL | 2 |
| **Investigation** | | | | | | |
| 16 | Knack | knack.be | hebdo référence | Oui | Belgique | 4 |
| 17 | Apache | apache.be | web coopératif | Oui | Belgique | 4 |
| 18 | Pano (VRT) | vrt.be/vrtmax/a-z/pano/ | documentaires TV | Non | Belgique | 4 |
| 19 | Fonds Pascal Decroos | fondspascaldecroos.org | fonds investigation | Non | NL Belgique | 2 |
| **Agence** | | | | | | |
| 20 | Belga | belga.be | agence nationale | Oui (B2B) | Belgique | 5 |
| **Radio/TV** | | | | | | |
| 21 | VTM Nieuws | vtm.be/vtm-nieuws | TV privée | Non | Flandre/Belgique | 3 |
| 22 | Radio 1 / De Ochtend | radio1.be | radio publique | Non | Belgique | 4 |
| 23 | Terzake (VRT Canvas) | vrt.be/vrtmax/a-z/terzake/ | current affairs TV | Non | Belgique | 5 |
| 24 | De Afspraak | vrt.be/vrtmax/a-z/de-afspraak/ | talk show quotidien | Non | Belgique | 4 |
| 25 | Onder ons: politiek | vrt.be (podcast) | podcast politique | Non | Belgique | 3 |
| **Institutionnel / politique** | | | | | | |
| 26 | Vlaams Parlement | vlaamsparlement.be | documents parlementaires | Non | Flandre/BXL | 4 |
| 27 | De Kamer | dekamer.be | parlement fédéral NL | Non | Belgique | 4 |
| 28 | Belgisch Staatsblad | ejustice.just.fgov.be | journal officiel | Non | Belgique | 5 |
| 29 | Doorbraak | doorbraak.be | opinion flamingante | Non | Flandre | 2 |
| 30 | 't Pallieterke / PAL NWS | pal.be | hebdo conservateur | Partiel | Flandre | 2 |
| **Social / logement** | | | | | | |
| 31 | Sociaal.Net | sociaal.net | web secteur social | Non | Flandre/BXL | 4 |
| 32 | SamPol | sampol.be | mensuel analyse | Partiel | Flandre | 3 |
| 33 | Netwerk Duurzame Mobiliteit | duurzame-mobiliteit.be | coalition ONG | Non | Flandre/BXL | 3 |
| **Indépendant / alternatif** | | | | | | |
| 34 | DeWereldMorgen | dewereldmorgen.be | web alternatif | Non | Belgique | 3 |
| 35 | MO* | mo.be | magazine international | Non | Belgique/monde | 2 |
| 36 | Rekto:Verso | rektoverso.be | trimestriel culture | Non | Flandre | 2 |
| 37 | StampMedia | stampmedia.be | agence jeunes | Non | Flandre/BXL | 2 |
| 38 | Newsmonkey | newsmonkey.be | web digital-native | Non | Belgique | 2 |
| 39 | Humo | humo.be | hebdo culture/politique | Partiel | Flandre | 2 |
| **Juridique** | | | | | | |
| 40 | Jubel.be | jubel.be | actualités juridiques NL | Non | Belgique | 3 |
| 41 | De Juristenkrant | jurisquare.be | bimensuel juridique | Oui | Belgique | 2 |
| 42 | LexGO.be | lexgo.be | portail juridique | Non | Belgique | 2 |
| 43 | Belgielex | belgielex.be | base législative | Non | Belgique | 3 |
| **Think tanks** | | | | | | |
| 44 | Itinera Institute | itinerainstitute.org | think tank indépendant | Non | Belgique | 3 |
| 45 | Denktank Minerva | denktankminerva.be | think tank progressiste | Non | Belgique | 2 |

### C.3 — MEDIAS ANGLOPHONES (28 sources)

| # | Nom | URL canonique | Type | Paywall | Couverture | Utilité BGM |
|---|-----|-------------|------|---------|-----------|-------------|
| **EU Affairs (basés à BXL)** | | | | | | |
| 1 | POLITICO Europe | politico.eu | quotidien web + hebdo print | Partiel | EU institutions | 4 |
| 2 | EUobserver | euobserver.com | quotidien web, non-profit | Partiel | EU + BXL | 4 |
| 3 | EURACTIV | euractiv.com | quotidien web + newsletters | Non | EU policy (12 langues) | 3 |
| 4 | The Parliament Magazine | theparliamentmagazine.eu | mensuel + web | Partiel | PE, Commission, Conseil | 2 |
| 5 | Agence Europe | agenceurope.eu | bulletin quotidien FR/EN | Oui | EU institutionnel | 3 |
| 6 | New Europe | neweurope.eu | hebdo | Non | EU policy | 2 |
| 7 | Brussels Signal | brusselssignal.eu | quotidien web (depuis 2023) | Non | EU + commentaire | 2 |
| **Médias belges EN** | | | | | | |
| 8 | The Brussels Times | brusselstimes.com | quotidien web + trimestriel | Partiel | Belgique + BXL + EU | 5 |
| 9 | The Bulletin | thebulletin.be | trimestriel + web | Non | Belgique expats | 3 |
| 10 | VRT NWS English | vrt.be/vrtnws/en/ | quotidien web | Non | Belgique/Flandre | 4 |
| 11 | Belga News Agency EN | belganewsagency.eu | wire service | Partiel | Belgique | 4 |
| 12 | Brussels Morning | brusselsmorning.com | quotidien web | Non | EU + BXL | 2 |
| 13 | Brussels Express | brussels-express.eu | quotidien web | Non | BXL vie locale | 2 |
| **Presse internationale** | | | | | | |
| 14 | Euronews | euronews.com | TV 24/7 + web | Non | EU + Europe | 3 |
| 15 | Reuters (bureau BXL) | reuters.com/world/europe/ | wire service | Partiel | EU + Belgique éco | 3 |
| 16 | AFP (bureau BXL) | afp.com | wire service | N/A | EU + Belgique | 3 |
| **Think tanks** | | | | | | |
| 17 | Bruegel | bruegel.org | think tank éco EU | Non (CC) | EU économie | 4 |
| 18 | CEPS | ceps.eu | think tank policy | Non | EU policy | 3 |
| 19 | European Policy Centre (EPC) | epc.eu | think tank | Non | EU intégration | 3 |
| 20 | Egmont Institute | egmontinstitute.be | think tank belge | Non | Belgique RI | 3 |
| 21 | Centre for European Reform | cer.eu | think tank | Non | EU governance | 2 |
| 22 | Martens Centre | martenscentre.eu | fondation EPP | Non | EU governance | 2 |
| **Expat** | | | | | | |
| 23 | Expatica Belgium | expatica.com/be/ | portail expat | Non | Belgique pratique | 2 |
| 24 | Flanders Today | flanderstoday.eu | web (réduit) | Non | Flandre/BXL | 2 |
| **Agrégateurs** | | | | | | |
| 25 | EU Agenda | euagenda.eu | agrégateur EU | Non | EU institutionnel | 2 |
| **Germanophone** | | | | | | |
| 26 | Grenz-Echo | grenzecho.net | quotidien DE | Oui | Belgique DE | 3 |
| 27 | BRF | brf.be | radio-TV publique DE | Non | Belgique DE | 3 |
| **Commentaire** | | | | | | |
| 28 | Brussels Report | brusselsreport.eu | web opinion | Non | EU libre-marché | 1 |

---

## D) SOURCES INSTITUTIONNELLES A AJOUTER AU REGISTRY

Ajouts prioritaires pour `source-registry.json` (watch cron) :

| Priorité | Nom | URL | Catégorie | Cartes affectées | Fréquence |
|----------|-----|-----|-----------|-----------------|-----------|
| **P0** | Moniteur belge | ejustice.just.fgov.be | governance | budget, tous | daily |
| **P0** | BRUGEL | brugel.brussels | énergie | climate, budget | weekly |
| **P0** | SLRB-BGHM | slrb-bghm.brussels/fr/publications | housing | housing | weekly |
| **P1** | Chambre (lachambre.be) | lachambre.be | governance | budget, social | weekly |
| **P1** | Sénat | senate.be | governance | institutional | weekly |
| **P1** | VGC | vgc.be/over-de-vgc/publicaties | governance NL | social | weekly |
| **P1** | loyers.brussels | loyers.brussels | housing | housing | weekly |
| **P1** | IRCELINE | irceline.be | climate | climate | daily |
| **P2** | SNCB/NMBS (mobilité BXL) | belgiantrain.be | mobility | mobility | weekly |
| **P2** | De Lijn (lignes BXL) | delijn.be/bruxelles/ | mobility | mobility | weekly |
| **P2** | SIBELGA | sibelga.be | énergie | climate | weekly |
| **P2** | CREG | creg.be | énergie | budget, climate | weekly |

---

## E) CONCENTRATION MEDIATIQUE — Note

La Belgique a une forte concentration médiatique. Pour une veille crédible, BGM doit trianguler :

**FR :**
- **Rossel** : Le Soir, L'Echo, Sudinfo
- **IPM** : La Libre, La DH, L'Avenir, LN24
- **RTL Belgium** : RTL Info (50% DPG Media, 50% Rossel)
- **RTBF** : public
- **Indépendants** : BX1, Medor, Wilfried, Alter Echos

**NL :**
- **DPG Media** : HLN, De Morgen, VTM, Humo
- **Mediahuis** : De Standaard, Het Nieuwsblad, GvA, HBvL
- **Roularta** : Knack, Trends, De Tijd (co-Rossel)
- **VRT** : public
- **Indépendants** : Apache, DeWereldMorgen, BRUZZ, MO*

**Recommandation :** toujours inclure au moins une source indépendante/coopérative par langue pour éviter le biais de concentration.

---

## F) RESUME EXECUTIF

| Métrique | Avant | Après analyse |
|----------|-------|---------------|
| Sources registry | 18 | 30 (proposé) |
| Sources FR media | 2 (BX1, RTBF) | 41 identifiées |
| Sources NL media | 0 | 45 identifiées |
| Sources EN media | 0 | 28 identifiées |
| Sources DE media | 0 | 2 identifiées |
| Gaps identifiés | non audité | 13 gaps documentés |
| Think tanks | 0 | 10 identifiés |
| Sources investigation | 0 | 6 identifiées (FR+NL) |
| Sources juridiques | 0 | 8 identifiées |
| Régulateurs sectoriels | 0 | 4 identifiés |

**Actions immédiates (P0) :**
1. Ajouter Moniteur belge au watch registry
2. Ajouter BRUGEL et SLRB au watch registry
3. Ajouter au moins 2 sources NL press (VRT NWS, BRUZZ) au watch registry
4. Ajouter au moins 1 source EN (Brussels Times) au watch registry

**Actions court terme (P1) :**
5. Intégrer la liste media dans une page `/sources` ou `/methodology`
6. Documenter la hiérarchie de confiance par type de source
7. Ajouter les think tanks EU pour les cartes comparaison

---

*Document généré le 2026-02-08 par Claude (Opus 4.6) pour le Brussels Governance Monitor.*
*Toutes les URLs ont été vérifiées par web search au moment de la rédaction.*
