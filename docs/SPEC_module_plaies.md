# SPEC Module Plaies — Captation de données LIDIA v5.0

Complément à SPEC_lidia_cotation_transmissions.md. À intégrer au data_dictionary (v1.1).
Principe : une plaie = un objet suivi dans le temps, alimenté à 3 moments (ouverture, réfection, clôture).
Budget de saisie : ouverture ≤ 60 s · réfection ≤ 5 taps · clôture ≤ 3 taps.

## Règles anti-redondance (bloquantes)

Ne JAMAIS capter dans le module plaies :
- Douleur → déjà dans OBS (douleur EN) au niveau passage
- Pathologies, diabète, autonomie, isolement → déjà dans le socle patient
- Signes généraux (confusion, dyspnée...) → déjà dans OBS
- La photo elle-même → vit dans Healico ; LIDIA ne trace que l'acte (« photo faite ») et la surface recopiée
- Date/heure/auteur du soin → hérités du Passage (passageId)
- Hospitalisation → mot-clé EVENEMENT global ; le module plaies pose seulement le lien (liee_plaie: id) si l'IDEL le confirme en 1 tap
- Acte et cotation du pansement → déjà dans la cotation du passage

Toute donnée = liste fermée ou nombre. Null ≠ valeur. Aucun pré-cochage.

## 1. OUVERTURE — création de la plaie (1 fois)

```
Plaie {
  id, patientId,
  date_debut: date,                    // ancienneté estimée si chronique
  localisation: enum(Jambe|Pied|Talon|Sacrum|Ischion|Trochanter|Abdomen|Thorax|Membre sup|Tête-face|Autre),
  lateralite: enum(D|G|Médian|NA),
  etiologie: enum(Ulcère veineux|Ulcère artériel|Ulcère mixte|Escarre|Pied diabétique|
                  Plaie chirurgicale|Traumatique|Brûlure|Tumorale|Autre),
  // — champs conditionnels —
  si Escarre:            stade_initial: enum(1|2|3|4|Non stadable)
  si Plaie chirurgicale: type_intervention: enum(Orthopédie|Digestif|Vasculaire|Cardio-thoracique|
                           Cutané-parties molles|Gynéco-uro|Autre),
                         date_operatoire: date,
                         adresseur: enum(CHU|Clinique|HAD|Médecin traitant|Autre)
  si Ulcère (tous):      ips_connu: enum(Oui mesuré|Non) + ips_valeur?: number
  suivi_specialise: enum(Non|Consultation plaies|HAD|Autre)   // la plaie est-elle déjà suivie ailleurs
}
```

## 2. RÉFECTION — à chaque pansement évaluatif (le cœur, ≤ 5 taps)

Rattachée au Passage. Chemin par défaut = 3 taps.

```
Refection {
  passageId, plaieId,
  lit: enum(Épidermisé|Bourgeonnant|Fibrineux|Nécrotique),      // 1 tap — aspect DOMINANT
  exsudat: enum(Absent|Modéré|Abondant),                         // 1 tap
  iso: "Aucun signe"                                             // 1 tap — OU détail :
       { rougeur_extensive: bool, ecoulement_purulent: bool,
         dehiscence: bool, fievre_rapportee: bool },             // 1 tap chacun si présent
  peri_lesionnelle?: enum(Saine|Macérée|Eczéma-rougeur),         // optionnel, 1 tap
  pansement: "Inchangé"                                          // 1 tap — OU si changement :
       enum(Hydrocellulaire|Hydrogel|Alginate|Hydrofibre|Interface|
            Pansement argent|Charbon|TPN|Compression associée|Autre),
  surface_cm2?: number,        // recopie Healico — attendue aux bilans (voir fraîcheur), pas à chaque soin
  orientation?: enum(Médecin traitant|Consultation plaies|Urgences)  // si avis demandé ce jour, 1 tap
}
```

UX : la réfection s'ouvre depuis le déclencheur cotation (AMI pansement) avec la dernière
réfection affichée en référence (« la semaine dernière : Fibrineux · Modéré · Aucun signe »).

## 3. CLÔTURE — fin de la plaie (1 fois)

```
Cloture {
  plaieId, date,
  issue: enum(Cicatrisée|Transférée (hospitalisation)|Transférée (consultation/HAD)|
              Amputation|Décès|Perdu de vue|Fin de prise en charge autre),
  // delai_cicatrisation calculé = date - date_debut (chronique) ou date - date_operatoire (chirurgicale)
}
```

## Règles de fraîcheur spécifiques plaies (s'ajoutent au moteur existant)

```
PHOTO_PLAIE_J = 15          // existant — par plaie active
SURFACE_J     = 15          // une surface_cm2 attendue par quinzaine par plaie active
BILAN_J30_CHIR              // plaie chirurgicale ouverte depuis ≥ 30 j sans clôture ni réfection
                            // avec surface → bandeau « Bilan J30 »
REFECTION_ORPHELINE         // cotation pansement validée sans Refection liée → compte en
                            // incomplétude au tableau de bord (pas de blocage)
```

## Ce que cette structure permet de calculer sans autre saisie

- Délai de cicatrisation par étiologie ; courbes de surface (avec Healico)
- Incidence des signes ISO à J30 sur les plaies chirurgicales + délai d'apparition
- Taux d'orientation et délai détection → avis
- Répartition des familles de pansements par stade du lit (pratiques réelles)
- Croisements avec socle/OBS/ICOPE via patientId (retard de cicatrisation × isolement,
  × ICOPE altéré, × polymédication) — la valeur unique du cabinet-cohorte
