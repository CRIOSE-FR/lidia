# Dictionnaire de données — LIDIA Cotation, module transmissions & recueil

> **Version 1.0 — 2026-08-25.** Toute modification de variable passe par une nouvelle
> version datée de ce fichier (aucune variable modifiée silencieusement) et, si le
> format stocké change, par une migration (`migratePatients()` ou équivalent).
> Référentiels : spec v5.0, ICOPE Step 1 (OMS), `docs/socle-pathologies.md` (fondement
> littérature de la liste de pathologies).

## Conventions générales

- **Exports** : CSV, séparateur `;`, encodage UTF-8 avec BOM, dates ISO `AAAA-MM-JJ`,
  valeurs commençant par `= + - @` préfixées d'une apostrophe (anti-injection tableur).
- **Pseudonymisation** : chaque dossier patient reçoit un code `P001…` **stable**
  (table `lidia.cot.codes`, clé = id interne du dossier). La table de correspondance
  code ↔ patient est affichée dans l'app (écran Conformité) et n'est **jamais exportée**.
  Aucun nom, aucune adresse, aucune note logistique, aucun post-it PERSO dans les exports.
- **Une ligne = un dossier** : les lignes patient dupliquées « Passage soir » partagent
  l'id du dossier ; l'export les dédoublonne.
- **Horodatage et signature** : toute transmission et tout passage portent `date` (ISO)
  et `auteur` (initiales de session, exigées au lancement de l'app).
- **Absence vs négatif (convention socle)** : les champs du socle ne sont interprétables
  que si `socleDate` est renseignée (socle validé par l'IDEL). `socleDate` vide ⇒ toutes
  les valeurs socle de la ligne sont « non renseignées », y compris les booléens à 0.
  Pour les mesures : champ vide = jamais recueilli (distinct d'une valeur normale).
  Aucune valeur n'est pré-cochée dans l'interface.

## Export `lidia_patients_*.csv` (une ligne par dossier)

| Colonne | Type / valeurs | Absence | Question de recherche associée |
|---|---|---|---|
| code | `Pnnn` stable | — | identifiant d'appariement entre exports |
| annee | entier (année de naissance) | vide | âge, seuil ICOPE ≥ 60 ans |
| sexe | `F` \| `H` | vide | description de la patientèle |
| commune | texte court saisi au socle (jamais dérivé de l'adresse) | vide | géographie des soins, densité |
| vitSeul | 0/1 | cf. convention socle | isolement, risque de maintien à domicile |
| aidant | 0/1 | cf. convention socle | présence aidant vs charge en soins |
| institution | 0/1 | cf. convention socle | domicile vs institution |
| pathos | liste fermée jointe par `\|` (19 entrées, cf. `socle-pathologies.md`) | vide si aucune cochée | comorbidités ; approximation Charlson/Elixhauser/eFI |
| nbMed | entier ≥ 0 | vide = non renseigné | polymédication (seuil ≥ 5, Masnoon 2017) |
| autonomie | `Autonome` \| `Aide partielle` \| `Dépendant` | vide | dépendance, approximation hémiplégie/paralysie |
| bsi | 0/1 | cf. convention socle | patientèle en forfait dépendance |
| palliatif | 0/1 (statut de prise en charge, issu du chip cotation) | — | identification fin de vie à domicile |
| adresse_par | `Sortie hospitalisation` \| `Médecin traitant` \| `Confrère IDEL` \| `Demande directe` \| `Autre` | vide | filières d'adressage |
| plaie | 0/1 (basculé automatiquement à la 1ʳᵉ cotation de plaie) | — | activation du suivi photo (15 j) |
| socleDate | date ISO de dernière validation du socle | vide = socle jamais validé | complétude et fraîcheur (365 j) |
| nbPassages | compteur de passages validés | 0 | charge en soins, exposition |
| nbTransmissions / nbLibre / nbEvenements / nbConstantes / nbObs / nbIcope / nbPhotos | compteurs par type | 0 | intensité et nature du recueil |
| der_ta, der_fc, der_spo2, der_temp, der_gly, der_poids | chaînes telles que saisies (`13/8`, `72`, `38,2`, `1,05`) | vide = jamais mesuré | dernières constantes connues |
| der_cst_date | date ISO de la dernière mesure | vide | fraîcheur constantes (35 j) |
| icope_mobilite … icope_audition | `ok` \| `alerte` (ICOPE Step 1, 6 domaines) | vide = jamais dépisté | capacité intrinsèque OMS |
| icope_nbAlerts | entier 0-6 | vide | sévérité du dépistage |
| icope_date | date ISO du dernier ICOPE | vide | fraîcheur ICOPE (120 j, ≥ 60 ans) |
| postits_releve / postits_alerte | compteurs (jamais le texte) | 0 | coordination inter-soignants |
| alertes_traitees | compteur d'alertes résolues | 0 | boucle de signalement fermée |
| refus_propositions | compteur de propositions refusées (`declined:true`) | 0 | acceptabilité du recueil |

## Export `lidia_evenements_*.csv` (une ligne par événement)

| Colonne | Type / valeurs | Question de recherche |
|---|---|---|
| code | `Pnnn` | appariement au dossier |
| date | date ISO | chronologie des ruptures de parcours |
| mot | `HOSPIT` \| `URGENCES` \| `CHUTE` \| `DÉCÈS` \| `EHPAD` | événements sentinelles ; le texte libre n'est **jamais** exporté |

## Structures stockées (localStorage, non exportées telles quelles)

- `Transmission` : `{id, date, auteur, type: LIBRE|EVENEMENT|CONSTANTES|OBS|ICOPE|PHOTO,
  texte, mot?, cst?{ta,fc,spo2,temp,gly,poids}, obs?{douleur,chute,confusion,peau,surcharge,observance},
  icope?{6 domaines}, nbAlerts?, passageId}`. Valeurs `obs` en listes fermées :
  douleur `0-10|oui` ; chute/confusion/surcharge `oui|non` ; peau `RAS|rougeur|plaie|escarre` ;
  observance `bonne|partielle|mauvaise`. Chaîne vide = non observé.
- `Passage` : `{id, patientId, date, auteur, actes[{id,k,c,l}], transmissionIds[],
  transmission:"none" si validé sans transmission, propositions[{type,declined}], geoloc? (opt-in)}`.
- `Postit` : `{id, date, auteur, type: RELEVE|ALERTE|PERSO, texte, luPar[], traite,
  traiteComment, exclureExport (forcé pour PERSO), archive}`. RELEVE/ALERTE s'archivent
  (traçabilité), seul PERSO se supprime ; PERSO jamais transmis ni exporté.
- Extraction IA : schéma fermé validé par `validerExtraction()` (rejet de tout champ ou
  valeur hors listes) ; jeu d'évaluation `eval/dictees.json` (30 dictées), critères
  bloquants : 0 invention, ≥ 90 % constantes et mot-clé (`node eval/score.js`).

## Journal des versions

| Version | Date | Changement |
|---|---|---|
| 1.0 | 2026-08-25 | Version initiale. Inclut : extension de la liste `pathos` de 7 à 19 entrées fermées (libellés d'origine inchangés, justification dans `socle-pathologies.md`) et ajout de la colonne `palliatif` à l'export patients. |
