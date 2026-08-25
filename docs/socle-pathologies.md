# Socle recherche — fondement de la liste fermée de pathologies

> Pourquoi ces catégories et pas d'autres : la liste est conçue pour que l'export
> pseudonymisé reste exploitable par la recherche dans les années à venir —
> comparable à la littérature, suffisant pour approcher les indices de comorbidité
> standards, et croisable avec les données que LIDIA recueille déjà (ICOPE,
> constantes, photos de plaies, passages). Synthèse d'une revue menée le 25/08/2026
> sur trois angles : épidémiologie française, indices de comorbidité, gériatrie.

## Principes de conception

1. **Liste fermée** : données comptables et anonymisables (pas de texte libre
   identifiant dans l'export). « Autre » reste le fourre-tout assumé.
2. **Ne jamais renommer** une entrée existante sans migration : les patients déjà
   saisis portent le libellé exact dans `pathos[]`.
3. Chaque catégorie doit servir au moins un des trois usages : décrire la
   patientèle IDEL (prévalence/charge en soins), calculer un score de comorbidité,
   ou se croiser avec une donnée déjà recueillie par l'app.
4. « Soins palliatifs » est un **statut de prise en charge**, pas une pathologie :
   il est exporté comme colonne dédiée (`palliatif`, issue du chip cotation
   existant), pas comme entrée de la liste.

## La liste (18 + Autre) et ses justifications

| Catégorie | Justification principale | Sources clés |
|---|---|---|
| Diabète | 3,8 M traités (5,6 %), 2ᵉ ALD (27 %) ; 1ᵉʳ moteur d'actes IDEL ; item Charlson/Elixhauser/eFI | SPF 2023 ; CNAM ALD 2022 ; Charlson 1987 |
| HTA | 1 adulte/3, >65 % des >65 ans ; covariable cardiovasculaire attendue ; item Elixhauser/eFI ; croise la TA recueillie | Esteban 2015 ; Elixhauser 1998 |
| Insuf. cardiaque | 1,38 M prévalents, 23,7 % des >85 ans ; PRADO IC ; item Charlson (poids 2 chez Quan 2011) | SPF BEH 03/2025 ; Quan 2011 |
| Mal. coronaire | 2,98 M prévalents ; item Charlson distinct de l'IC — sans elle le CCI est incalculable | SPF BEH 03/2025 ; Charlson 1987 |
| FA / tr. rythme | Item Elixhauser + déficit eFI ; surveillance anticoagulants/INR = acte IDEL historique | Elixhauser 1998 ; Clegg 2016 |
| AVC / séquelles | >1 M prévalents, ¼ ont ≥85 ans ; cause majeure de dépendance/BSI ; item Charlson/eFI | SPF BEH 03/2025 ; Charlson 1987 |
| AOMI | ~760 000 pris en charge, ~40 % après 80 ans ; plaies artérielles ; item Charlson/eFI | SPF 2022 ; Inserm |
| BPCO / insuf. resp. | 3,5 M (7,5 % des adultes), ~100 000 IRC à domicile ; PRADO BPCO ; item Charlson/Elixhauser/eFI | Inserm ; Charlson 1987 |
| Insuf. rénale | 93 000 IRCT traités ; comorbidité structurante ; item Charlson (poids 2) | Registre REIN 2022 ; Charlson 1987 |
| Hépatopathie chr. | Rare mais seul item Charlson à poids fort (jusqu'à 4 chez Quan) absent sinon — son omission fausserait tout CCI calculé depuis l'export | Charlson 1987 ; Quan 2011 |
| Cancer actif | 433 000 nouveaux cas/an, 3ᵉ ALD ; virage ambulatoire (PICC, chimio à domicile) ; item Charlson (poids 2) | INCa 2024 ; Charlson 1987 |
| Cancer métastatique | Item Charlson au poids maximal (6), distinct de « any malignancy » — la distinction actif/métastatique est le seul découpage compatible Charlson ET Elixhauser (hiérarchie : métastatique ⇒ ne pas compter deux fois) | Quan 2011 ; Elixhauser 1998 |
| Tr. cognitifs | 1,2–1,4 M de démences ; 1ᵉʳ déterminant de dépendance à domicile ; item Charlson (poids 2 chez Quan)/eFI/interRAI | SPF ; Fond. Rech. Alzheimer 2024 ; Quan 2011 |
| Parkinson | ~175 000 traités ; nursing lourd, horaires contraints ; déficit eFI, diagnostic validé interRAI | SPF BEH 2018 ; Foebel 2013 |
| Tr. psychiatriques | 2,5 M pris en charge, 1ᵉʳ poste de dépenses AM ; injections retard = activité IDEL spécifique ; items Elixhauser (depression, psychoses) | CNAM 2022 ; Elixhauser 1998 |
| Plaie chronique / escarre | 650 000 patients, ~1 Md€/an de soins de ville ; cœur de l'activité pansements ; croise le suivi photo (PHOTO_PLAIE_J) | Assurance Maladie 2015 (SNIIRAM) ; EPUAP/NPIAP 2019 |
| Dénutrition | 400 000 personnes âgées dénutries à domicile ; croise le poids des constantes et le domaine nutrition d'ICOPE | HAS 2021 ; Ministère 2021 |
| Ostéoporose / fracture | Axe musculo-squelettique/chute des indices de fragilité (4 déficits eFI) ; le versant « événement chute » est déjà capté par les observations et ICOPE | Clegg 2016 ; Montero-Odasso 2022 |
| Autre | Fourre-tout assumé (VIH, épilepsie, SEP, rhumatismes inflammatoires… à réévaluer si prévalence notable dans la patientèle) | — |

## Ce que l'export permet de calculer

- **Charlson (CCI)** original 1987 et version Quan 2011 : quasi complet. Items
  volontairement non représentés : ulcère peptique (poids 0 chez Quan),
  rhumatisme inflammatoire et VIH (rares en patientèle IDEL âgée → « Autre »).
  L'hémiplégie s'approche par le champ autonomie ; « diabète compliqué » par le
  croisement diabète × plaie.
- **Elixhauser / van Walraven** : approximation partielle — les items « hospitaliers »
  (coagulopathie, troubles hydro-électrolytiques…) sont hors de portée d'un socle
  déclaratif ; les items aux poids les plus forts sont couverts.
- **eFI (Clegg 2016)** : les déficits « maladies chroniques » sont couverts ; les
  déficits fonctionnels (mobilité, sensoriel, polymédication) relèvent du recueil
  de passage et d'ICOPE, déjà présents dans l'app.

## Variables candidates non retenues (à réévaluer)

- **Polymédication (≥ 5 méd./j)** : déjà couverte par le champ `nbMed` du socle.
- **Fragilité (diagnostic)** : dérivable du dépistage ICOPE recueilli ; un booléen
  dédié pourrait être ajouté si une équipe le demande.
- **Incontinence** : renforcerait la comparabilité interRAI ; pas de croisement
  avec les données actuelles de l'app.
- **Chutes répétées** : événement, déjà capté par les observations (chute) et le
  mot-clé CHUTE — pas une pathologie de socle.
