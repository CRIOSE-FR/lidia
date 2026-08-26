# LIDIA Cotation

Application professionnelle de cotation destinée aux infirmiers libéraux français.

## Priorités

1. Exactitude réglementaire
2. Absence de perte de données
3. Simplicité d'utilisation
4. Performance
5. Esthétique

## Règles Claude Code

Avant de modifier une fonctionnalité :
- explorer le code concerné (sections balisées du fichier unique) ;
- comprendre le modèle de données (clés `lidia.cot.*` en localStorage) ;
- rechercher les tests associés (`tests/moteur.test.js`) ;
- éviter les réécritures inutiles.

Pour toute modification NGAP : utiliser l'agent `ngap-expert`.
Pour tout changement important du moteur : faire ensuite intervenir `ngap-tester`.
Pour toute modification visuelle : utiliser `idel-ux`.
Pour la lecture d'ordonnance ou n8n : utiliser `prescription-ai`.
Pour la sécurité et les données de santé : utiliser `security-health`.
Pour le module transmissions/recueil v5 (socle, constantes, ICOPE, post-its, dictée, export) : utiliser `architecte-donnees-probantes` — dictionnaire de données obligatoire (`docs/data_dictionary.md`, versionné : aucune variable modifiée silencieusement).
Avant déploiement : utiliser `regression-reviewer` (`bash tests/review.sh`).

## Interdictions

- aucune clé API Anthropic dans le frontend ;
- aucune règle NGAP inventée — règle douteuse = `tags:{verif:1}` + badge « à vérifier » ;
- aucune cotation décidée par le LLM ;
- aucune modification silencieuse du format des données sauvegardées — tout changement de schéma passe par une migration (`migratePatients()` ou équivalent) ;
- aucune suppression d'une fonctionnalité existante pour simplifier le développement.

## Principe architectural

L'IA extrait.
Le moteur métier décide.
L'interface explique.
L'utilisateur valide.

## v5 — Transmissions & données (spec v5.0)

- Un seul flux par passage : cotation + transmission + recueil, validés ensemble (`EcranPassage`, section `#tab-passage`). Zéro double saisie : la donnée est un sous-produit de l'acte.
- `DATA_MODE = "test"` tant que l'hébergement n'est pas HDS : bandeau permanent, patients fictifs uniquement. Passer en `"production"` exige un hébergement HDS et un provider IA conforme santé.
- Moteur de fraîcheur : `freshness(patient, today)` (pure) — `SOCLE_J=365`, `CONSTANTES_J=35`, `PHOTO_PLAIE_J=15`, `ICOPE_J=120` (≥ 60 ans). États `ok|late|missing|na`, pastilles dans la tournée, bandeaux d'action dans l'écran de passage, tableau de bord `#tab-dash`.
- Déclencheurs cotation → recueil : `TRIGGERS_TABLE` + `computeTriggers()` (pure). Max 2 propositions par passage, priorité photo > ICOPE > constantes > socle, refus toujours possible et tracé (`declined:true`). Écarts volontaires vs la table de la spec : la revalidation socle sur BSI ne se propose que si le socle n'est pas `ok` (un forfait quotidien la proposerait chaque jour) ; « constantes si late » inclut `missing` (jamais mesurées).
- Post-its typés : `RELEVE` (bandeau tournée + « Lu »), `ALERTE` (badge tant que non traité, rappel > 48 h), `PERSO` (`exclureExport` forcé, jamais transmis ni exporté). RELEVE/ALERTE s'archivent, seul PERSO se supprime.
- Dictée IA : interface `ExtracteurIA` (providers `EXTRACTEURS` : n8n / API directe / hors-ligne). Prompt `DICTEE_SYS` : JSON strict, schéma fermé, zéro invention. `validerExtraction()` rejette tout champ hors liste fermée. Champ `refection` : pré-remplit le panneau réfection de la plaie ciblée (`ciblerPlaie()` — une seule candidate, jamais de devinette), validation IDEL obligatoire. Jamais d'enregistrement automatique. Jeu d'éval : `eval/dictees.json` (40, dont 5 douleur ALGOPLUS) + `node eval/score.js` (bloquant : 0 invention, ≥ 90 % constantes/mot-clé).
- Instruments validés v5.4 (dictionnaire v1.4) : douleur double mode `EN` (tranches)/`ALGOPLUS` (5 items O/N, score moteur, seuil ≥ 2, `mode_douleur` mémorisé par patient, bascule proposée 1× si ICOPE cognition alerte) ; PUSH calculé (`pushScore`, jamais saisi) sur la réfection ; Braden au socle si BSI/Dépendant ; confusion = libellé SQiD ; `iso_j30_statut` calculé (mapping `docs/iso_cdc_mapping.md`) ; Wound-QoL ouverture/clôture (libellés STRICTEMENT hors code — `woundqol_items_fr.json`, placeholder bloquant, licence à vérifier) ; Girerd si `nbMed ≥ 5` ; complétude « qualité renforcée » (`completudeSouhaitable`, souhaitable, n'abaisse jamais le % principal).
- Export CSV pseudonymisé (P001…) : `buildExport()` — socle + agrégats + événements datés (code/date/mot, sans texte) + dernières constantes + dernier ICOPE + compteurs + CSV plaies/réfections (identifiants `Pnnn-k`). Table code↔patient affichée dans l'app, jamais exportée.
- Module plaies (spec Module Plaies v5.0, dictionnaire v1.2) : `p.plaies[]` sur le dossier UNIQUEMENT (migration `migratePatients` — les copies « Passage soir » sont purgées ; `savePatient` préserve `plaies` comme `transmissions`/`postits`), ouverture/réfection/clôture/réouverture via `appliquerPlaiesActions()` (pur, validé par listes fermées `validerPlaie`/`validerRefection`/`validerCloture`), date et passageId hérités du passage, `ouverture_date` = borne des réfections orphelines. Anti-redondance bloquante : jamais douleur/pathologies/signes généraux/photo/date-auteur/cotation dans ce module ; hospitalisation = EVENEMENT global + lien `liee_plaie` confirmé en 1 tap (exporté en `Pnnn-k`). Fraîcheur : `SURFACE_J=15`, `BILAN_CHIR_J=30` (bandeau J30 chirurgical), `refectionsOrphelines()` en incomplétude au tableau de bord (jamais bloquant). UI : bandeau `#epPlaies` déclenché par la cotation pansement (`PLAIE_ACTS`), réfection ≤ 5 taps avec dernière réfection en référence, clôture ≤ 3 taps (réouverture tracée ≤ 7 j), refus tracé (`type:"plaie"`), `date_debut` jamais pré-remplie (chip « Découverte ce jour »), ✎ avec instantané (Annuler restaure l'état confirmé).
- Nouvelles clés localStorage : `lidia.cot.settings` (initiales, geoloc opt-in, rattrapage, provider IA), `lidia.cot.passages` (passages validés), `lidia.cot.drafts` (brouillons par patient — un brouillon d'une autre date n'est JAMAIS détruit : reprise proposée ou archivage `archive_*`), `lidia.cot.codes` (pseudonymes P001… stables par patientId).
- Modèle « dossier » : les lignes patient dupliquées « Passage soir » partagent le même `id` ; `dossier(p)` (première ligne portant cet id) est l'unique porteuse des transmissions/post-its/socle — toute lecture/écriture v5 passe par elle, l'export et le tableau de bord dédupliquent par id.
- Validation du passage : écritures localStorage tout-ou-rien (restauration des trois clés en cas d'échec) — ne pas réordonner sans conserver cette garantie.
- Tests v5 : `tests/v5.test.js` (chargé comme `moteur.test.js` : tout le moteur v5 doit rester défini AVANT le `DOMContentLoaded`).

## Invariants techniques (pattern LIDIA)

- Livrable unique : `lidia-cotation.html` (vanilla JS, aucun build). Déploiement Netlify par ZIP.
- Règles NGAP centralisées dans `CATALOG`, `DEFAULT_REF`, `computePassage`/`computeDay`, `INCLUS_BSI`, `LV()`. Référence : NGAP 21/06/2026 + CIR-9/2025 ; bascule AMI 3,35 € au 06/11/2026 dans `LV()`.
- IA : webhook n8n `https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation` (credential n8n `x-api-key`, jeton Header Auth optionnel), workflow `n8n_lidia_cotation.json`.
- Données 100 % locales, patients en initiales, chaînes externes échappées via `esc()` avant `innerHTML`.
- Un même patient (nom + adresse) matin et soir : cotation liée (forfaits 1×/jour, AMX/IFI, pas de MAU).
- Tests avant toute livraison : `bash tests/run.sh` ; revue complète : `bash tests/review.sh`.
- Versionnage `vX.Y.Z` dans le `<header>`, incrémenté à chaque modification.
