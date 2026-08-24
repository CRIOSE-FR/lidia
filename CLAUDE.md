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

## Invariants techniques (pattern LIDIA)

- Livrable unique : `lidia-cotation.html` (vanilla JS, aucun build). Déploiement Netlify par ZIP.
- Règles NGAP centralisées dans `CATALOG`, `DEFAULT_REF`, `computePassage`/`computeDay`, `INCLUS_BSI`, `LV()`. Référence : NGAP 21/06/2026 + CIR-9/2025 ; bascule AMI 3,35 € au 06/11/2026 dans `LV()`.
- IA : webhook n8n `https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation` (credential n8n `x-api-key`, jeton Header Auth optionnel), workflow `n8n_lidia_cotation.json`.
- Données 100 % locales, patients en initiales, chaînes externes échappées via `esc()` avant `innerHTML`.
- Un même patient (nom + adresse) matin et soir : cotation liée (forfaits 1×/jour, AMX/IFI, pas de MAU).
- Tests avant toute livraison : `bash tests/run.sh` ; revue complète : `bash tests/review.sh`.
- Versionnage `vX.Y.Z` dans le `<header>`, incrémenté à chaque modification.
