# Dictionnaire de données — LIDIA Cotation, module transmissions & recueil

> **Version 1.2 — 2026-08-25.** Toute modification de variable passe par une nouvelle
> version datée de ce fichier (aucune variable modifiée silencieusement) et, si le
> format stocké change, par une migration (`migratePatients()` ou équivalent).
> Référentiels : spec v5.0, spec Module Plaies v5.0, ICOPE Step 1 (OMS),
> `docs/socle-pathologies.md` (fondement littérature de la liste de pathologies).

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
| plaie | 0/1 (basculé automatiquement à la 1ʳᵉ cotation de plaie ; suit les plaies enregistrées : retombe à 0 quand la dernière plaie du dossier est clôturée) | — | activation du suivi photo (15 j) |
| nb_plaies_actives | entier ≥ 0 (plaies du module plaies sans clôture) | 0 | charge en plaies, appariement avec l'export plaies |
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
| liee_plaie | `Pnnn-k` (HOSPIT uniquement, lien confirmé par l'IDEL en 1 tap — jamais déduit) ; vide = non liée ou non confirmée | hospitalisations attribuables aux plaies (spec module plaies) |

## Export `lidia_plaies_*.csv` (une ligne par plaie — module plaies v5.2)

Identifiant de plaie pseudonymisé `Pnnn-k` : code patient + rang d'ouverture dans le
dossier (append-only, donc stable). Règles anti-redondance de la spec : ce module ne
capte ni douleur (OBS), ni pathologies (socle), ni signes généraux (OBS), ni la photo
(transmission PHOTO ; l'image vit dans Healico), ni date/auteur du soin (hérités du
passage), ni hospitalisation (mot-clé EVENEMENT), ni la cotation. Toute donnée est une
liste fermée ou un nombre ; null ≠ valeur ; aucun pré-cochage.

| Colonne | Type / valeurs | Absence | Question de recherche associée |
|---|---|---|---|
| code | `Pnnn` | — | appariement au dossier patient |
| plaie | `Pnnn-k` stable | — | appariement plaie ↔ réfections |
| date_debut | date ISO (ancienneté estimée si chronique) | — (requise) | délai de cicatrisation, ancienneté à la prise en charge |
| localisation | `Jambe` \| `Pied` \| `Talon` \| `Sacrum` \| `Ischion` \| `Trochanter` \| `Abdomen` \| `Thorax` \| `Membre sup` \| `Tête-face` \| `Autre` | — (requise) | topographie, pression vs vasculaire |
| lateralite | `D` \| `G` \| `Médian` \| `NA` | — (requise) | distinction de plaies multiples |
| etiologie | `Ulcère veineux` \| `Ulcère artériel` \| `Ulcère mixte` \| `Escarre` \| `Pied diabétique` \| `Plaie chirurgicale` \| `Traumatique` \| `Brûlure` \| `Tumorale` \| `Autre` | — (requise) | délais et pratiques par étiologie |
| stade_initial | `1`-`4` \| `Non stadable` (escarres uniquement) | vide = non applicable | sévérité initiale des escarres |
| type_intervention | `Orthopédie` \| `Digestif` \| `Vasculaire` \| `Cardio-thoracique` \| `Cutané-parties molles` \| `Gynéco-uro` \| `Autre` (chirurgicales uniquement) | vide = non applicable | incidence ISO par spécialité |
| date_operatoire | date ISO (chirurgicales) | vide = non applicable | point de départ du suivi J30 |
| adresseur | `CHU` \| `Clinique` \| `HAD` \| `Médecin traitant` \| `Autre` (chirurgicales) | vide = non applicable | filières ville-hôpital |
| ips_connu | `Oui mesuré` \| `Non` (ulcères uniquement) | vide = non applicable | conformité au bilan vasculaire recommandé |
| ips_valeur | nombre (index de pression systolique, si mesuré) | vide = non communiqué | sévérité artérielle |
| suivi_specialise | `Non` \| `Consultation plaies` \| `HAD` \| `Autre` | — (requise) | recours au second niveau |
| nb_refections | compteur | 0 | intensité du suivi |
| cloture_date / issue | date ISO ; `Cicatrisée` \| `Transférée (hospitalisation)` \| `Transférée (consultation/HAD)` \| `Amputation` \| `Décès` \| `Perdu de vue` \| `Fin de prise en charge autre` | vides = plaie active | devenir des plaies en ville |
| delai_cicatrisation | entier (jours), **calculé jamais saisi** : clôture − date_debut (chronique) ou clôture − date_operatoire (chirurgicale) | vide = plaie active | critère de jugement principal |

## Export `lidia_refections_*.csv` (une ligne par réfection évaluative)

Rattachée au passage (`passageId`) : date et auteur **hérités**, jamais ressaisis.
Chemin de saisie par défaut : lit + exsudat + « Aucun signe » (3 taps) ; le reste est
facultatif — champ vide = non renseigné, jamais une valeur par défaut.

| Colonne | Type / valeurs | Absence | Question de recherche associée |
|---|---|---|---|
| code / plaie | `Pnnn` / `Pnnn-k` | — | appariement |
| date | date ISO (héritée du passage) | — | courbes temporelles |
| lit | `Épidermisé` \| `Bourgeonnant` \| `Fibrineux` \| `Nécrotique` (aspect dominant) | — (requis) | évolution du lit, pansement × stade |
| exsudat | `Absent` \| `Modéré` \| `Abondant` | — (requis) | charge exsudative |
| iso_aucun | 0/1 (« Aucun signe » coché) | — (requis : soit iso_aucun=1, soit ≥ 1 signe) | surveillance ISO |
| iso_rougeur / iso_ecoulement / iso_dehiscence / iso_fievre | 0/1 (rougeur extensive, écoulement purulent, déhiscence, fièvre rapportée) | 0 si iso_aucun=1 | incidence et délai d'apparition des signes ISO (J30 chirurgical) |
| peri_lesionnelle | `Saine` \| `Macérée` \| `Eczéma-rougeur` | vide = non renseignée | tolérance du protocole |
| pansement | `Inchangé` ou `Hydrocellulaire` \| `Hydrogel` \| `Alginate` \| `Hydrofibre` \| `Interface` \| `Pansement argent` \| `Charbon` \| `TPN` \| `Compression associée` \| `Autre` | vide = non renseigné (≠ Inchangé) | pratiques réelles par famille |
| surface_cm2 | nombre (recopie Healico — attendue 1×/quinzaine par plaie active et au bilan J30 chirurgical, pas à chaque soin) | vide = non recopiée | courbes de surface, vitesse de cicatrisation |
| orientation | `Médecin traitant` \| `Consultation plaies` \| `Urgences` (avis demandé ce jour) | vide = pas d'avis | taux et délai détection → avis |

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
- `Transmission` EVENEMENT : champ optionnel `liee_plaie` (id interne de plaie, posé uniquement
  si mot=HOSPIT et confirmé en 1 tap ; traduit en `Pnnn-k` à l'export, l'id brut ne sort jamais).
- `Plaie` (sur le dossier patient, `p.plaies[]`, append-only) : `{id, patientId, date_debut,
  ouverture_date (date du passage d'enregistrement — borne basse des réfections orphelines,
  distincte de date_debut qui peut être une ancienneté estimée), localisation, lateralite,
  etiologie, stade_initial?, type_intervention?, date_operatoire?,
  adresseur?, ips_connu?, ips_valeur?, suivi_specialise, refections[], cloture:{date,issue}|null,
  reouvertures?[{passageId,date,annulee}]} — une clôture erronée se corrige par réouverture
  tracée (l'ancienne clôture est conservée dans `annulee`), jamais par modification silencieuse.
  `Refection` : `{passageId, date (héritée du passage), lit, exsudat,
  iso:"Aucun signe"|{rougeur_extensive,ecoulement_purulent,dehiscence,fievre_rapportee},
  peri_lesionnelle?, pansement?, surface_cm2?, orientation?}`. Validation par listes fermées
  (`validerPlaie`/`validerRefection`/`validerCloture`) — tout champ hors schéma est ignoré.
- Fraîcheur plaies (`plaieFraicheur`, par plaie active) : `PHOTO_PLAIE_J=15` (photo au niveau
  passage — les photos ne sont pas rattachées à une plaie, par anti-redondance la règle
  s'applique au dossier dès qu'une plaie est active), `SURFACE_J=15` (une surface par
  quinzaine ; **écart volontaire** vs la lettre de la spec : une plaie active sans aucune
  surface est `missing` et signalée dès l'enregistrement — la première recopie sert de
  référence, même logique que « jamais fait » dans le moteur de fraîcheur existant),
  `BILAN_CHIR_J=30` (bandeau « Bilan J30 » : plaie chirurgicale ouverte ≥ 30 j
  sans clôture ni réfection portant une surface — le bandeau s'éteint à la première surface).
  `refectionsOrphelines()` : passage avec cotation pansement, plaie ouverte ce jour-là
  (borne basse : `ouverture_date`) et aucune réfection liée → compteur d'incomplétude au
  tableau de bord, jamais bloquant — les passages antérieurs à l'enregistrement d'une plaie
  ancienne ne sont pas comptés comme des oublis.
  Le refus d'ouvrir une plaie est tracé (`propositions[{type:"plaie",declined:true}]`).
  `date_debut` n'est **jamais pré-remplie** (le chip « Découverte ce jour » pose la date du
  passage en un tap explicite) : un pré-remplissage silencieux fausserait le délai de
  cicatrisation des plaies chroniques.

## Journal des versions

| Version | Date | Changement |
|---|---|---|
| 1.0 | 2026-08-25 | Version initiale. Inclut : extension de la liste `pathos` de 7 à 19 entrées fermées (libellés d'origine inchangés, justification dans `socle-pathologies.md`) et ajout de la colonne `palliatif` à l'export patients. |
| 1.1 | 2026-08-25 | Module Plaies (spec Module Plaies v5.0) : nouveaux exports `lidia_plaies_*.csv` et `lidia_refections_*.csv`, structures `Plaie`/`Refection`/`Cloture` sur le dossier patient (migration `migratePatients` : `p.plaies=[]`), règles de fraîcheur `SURFACE_J=15` et `BILAN_CHIR_J=30`, compteur de réfections orphelines. Export patients : ajout de la colonne `nb_plaies_actives` ; la sémantique de `plaie` est précisée (retombe à 0 à la clôture de la dernière plaie enregistrée). Aucune colonne existante renommée ni supprimée. |
| 1.2 | 2026-08-25 | Suite de revue (16 findings vérifiés) : colonne `liee_plaie` (`Pnnn-k`) dans l'export événements — lien hospitalisation ↔ plaie confirmé en 1 tap (spec) ; champ `ouverture_date` sur `Plaie` (migration : backfill première réfection sinon date du jour) comme borne des réfections orphelines ; trace `reouvertures[]` (correction d'une clôture erronée, jamais silencieuse) ; `date_debut` jamais pré-remplie (chip explicite « Découverte ce jour ») ; écart volontaire documenté : surface `missing` dès l'enregistrement d'une plaie active. Aucune colonne existante renommée ni supprimée. |
