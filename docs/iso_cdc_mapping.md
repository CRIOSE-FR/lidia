# Mapping CDC/HAS des signes ISO captés par LIDIA — documentation exécutable

> **Version 1.0 — 2026-08-26** (dictionnaire de données v1.4). Ce document décrit la
> correspondance entre les 4 signes locaux captés à chaque réfection de plaie
> (`REF_ISO` : listes fermées, jamais de texte libre) et les catégories de surveillance
> des infections du site opératoire (ISO) du CDC (NHSN, critères superficiel/profond/
> organe-espace) reprises par la HAS et les CPias pour la surveillance en ville.
> Il est « exécutable » : la règle décrite ici est implémentée par la fonction pure
> `isoJ30Statut(plaie)` de `lidia-cotation.html` et testée dans `tests/v5.test.js` —
> toute modification de ce mapping passe par une nouvelle version de ce fichier ET des tests.

## Ce que LIDIA capte (rappel du cadre)

À chaque réfection : `iso = "Aucun signe"` OU un sous-ensemble de
`{rougeur_extensive, ecoulement_purulent, dehiscence, fievre_rapportee}` (booléens,
uniquement les signes constatés — null ≠ valeur). LIDIA n'établit **pas de diagnostic
d'ISO** (qui exige critères microbiologiques et avis médical) : elle produit un signal
de **suspicion** à trois niveaux, analysable en recherche et actionnable en ville
(orientation vers le médecin/chirurgien).

## Table de correspondance

| Signe capté (`REF_ISO`) | Libellé UI | Critère CDC/NHSN approché | Catégorie CDC concernée | Poids dans le statut |
|---|---|---|---|---|
| `ecoulement_purulent` | Écoulement purulent | *Purulent drainage from the incision* — critère A des ISO superficielles et profondes | Superficielle **ou** profonde | **Suspicion forte** |
| `dehiscence` | Déhiscence | *Deep incision that spontaneously dehisces* (avec signes) — critère des ISO profondes | Profonde | **Suspicion forte** |
| `rougeur_extensive` | Rougeur extensive | *Localized redness* (signe inflammatoire local, critère « à explorer » nécessitant l'avis du praticien) | Superficielle (à explorer) | Signe mineur |
| `fievre_rapportee` | Fièvre rapportée | *Fever (> 38 °C)* — signe général associé aux ISO profondes/organe-espace, non spécifique isolément | Profonde / organe-espace (à explorer) | Signe mineur |

## Règle d'agrégation (implémentée par `isoJ30Statut`)

Sur la **fenêtre J0–J30** après la date opératoire (`date_operatoire`, plaies
chirurgicales uniquement — fenêtre standard de surveillance CDC des ISO sans implant) :

1. **écoulement purulent OU déhiscence** constaté sur ≥ 1 réfection de la fenêtre
   → **« Suspicion ISO »** (suspicion forte → catégorie dédiée dans les analyses) ;
2. sinon, **rougeur extensive OU fièvre rapportée** sur ≥ 1 réfection de la fenêtre
   → **« Signes mineurs »** (à explorer) ;
3. sinon, ≥ 1 réfection de la fenêtre avec signes locaux renseignés (y compris
   « Aucun signe ») → **« Aucun signe »** ;
4. aucune réfection évaluée dans la fenêtre → **vide** (non évaluable — distinct de
   « Aucun signe », convention absence ≠ négatif du dictionnaire).

Le statut est **calculé, jamais saisi**, et exporté dans `lidia_plaies_*.csv`
(colonne `iso_j30_statut`, plaies chirurgicales uniquement). Les signes bruts par
réfection restent disponibles dans `lidia_refections_*.csv` (`iso_*`), datés, pour
toute analyse plus fine (délai d'apparition, incidence par spécialité).

## Limites documentées

- La fièvre est **rapportée** (patient/entourage), pas mesurée par le module plaies
  (la température mesurée vit dans les constantes de la transmission) — signal faible.
- Aucun critère microbiologique ni avis chirurgical n'est capté : « Suspicion ISO »
  n'est **pas** un diagnostic CDC, c'est un signal de détection en ville.
- Les ISO organe-espace ne sont pas différenciables des profondes avec ces 4 signes :
  elles sont agrégées dans la même catégorie de suspicion.
