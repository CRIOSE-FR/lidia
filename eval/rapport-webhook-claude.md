# Rapport d'évaluation — dictées LIDIA via webhook n8n (Claude)

- **Date et heure** : exécution lancée le 2026-08-25 à 07:26 UTC, terminée à 07:44 UTC
- **Provider** : webhook n8n (`https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation`) → Claude
- **Commande** :

```bash
LIDIA_WEBHOOK=https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation node eval/score.js
```

## Sortie intégrale et brute du script

```
Éval dictées (30 dictées, extracteur webhook) :
  mot-clé     5/5  (100 %)
  constantes  10/17  (59 %)
  observations 1/9  (11 %)
  icope       0/0  (100 %)
  post-its    5/5  (100 %)
  inventions  6
  ⚠ INVENTION #22 icope.mobilite inventé : "ok"
  ⚠ INVENTION #22 icope.cognition inventé : "alerte"
  ⚠ INVENTION #22 icope.nutrition inventé : "ok"
  ⚠ INVENTION #22 icope.humeur inventé : "ok"
  ⚠ INVENTION #22 icope.vision inventé : "ok"
  ⚠ INVENTION #22 icope.audition inventé : "ok"
  ✗ #3 cst.gly : attendu "1,05", obtenu ""
  ✗ #4 cst.gly : attendu "0,85", obtenu ""
  ✗ #6 cst.poids : attendu "72", obtenu ""
  ✗ #7 cst.spo2 : attendu "89", obtenu ""
  ✗ #8 cst.fc : attendu "110", obtenu "110 irrégulier"
  ✗ #13 obs.chute : attendu "oui", obtenu ""
  ✗ #15 obs.peau : attendu "rougeur", obtenu ""
  ✗ #19 obs.peau : attendu "plaie", obtenu ""
  ✗ #21 obs.douleur : attendu "5", obtenu ""
  ✗ #22 obs.confusion : attendu "oui", obtenu ""
  ✗ #23 obs.surcharge : attendu "oui", obtenu ""
  ✗ #24 obs.observance : attendu "mauvaise", obtenu ""
  ✗ #26 cst.temp : attendu "39", obtenu ""
  ✗ #27 cst.gly : attendu "2", obtenu ""
  ✗ #29 obs.peau : attendu "escarre", obtenu ""
ÉCHEC : invention détectée (critère bloquant : 0 tolérée).
```

Code de sortie : `1`.

## Verdict : ÉCHEC

Critères bloquants (spec v5) :

- **0 invention** : ÉCHEC — 6 inventions détectées (les 6 domaines ICOPE de la dictée #22 remplis alors qu'aucun bilan ICOPE n'était attendu).
- **≥ 90 % constantes** : ÉCHEC — 10/17 (59 %).
- **≥ 90 % mot-clé** : OK — 5/5 (100 %).

L'exécution est allée au bout des 30 dictées (appels webhook séquentiels, ~18 minutes). Le webhook a répondu correctement (HTTP 200, JSON valide) sur l'ensemble des appels — l'échec porte sur la qualité de l'extraction, pas sur la connectivité.
