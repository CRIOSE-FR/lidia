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
- Dictée IA : interface `ExtracteurIA` (providers `EXTRACTEURS` : n8n / API directe / hors-ligne). Prompt `DICTEE_SYS` : JSON strict, schéma fermé, zéro invention. `validerExtraction()` rejette tout champ hors liste fermée. Jamais d'enregistrement automatique. Jeu d'éval : `eval/dictees.json` + `node eval/score.js` (bloquant : 0 invention, ≥ 90 % constantes/mot-clé).
- Export CSV pseudonymisé (P001…) : `buildExport()` — socle + agrégats + événements datés (code/date/mot, sans texte) + dernières constantes + dernier ICOPE + compteurs. Table code↔patient affichée dans l'app, jamais exportée.
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
