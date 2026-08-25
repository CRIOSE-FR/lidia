# Rapport d'évaluation — dictées LIDIA via webhook n8n (Claude)

- **Date** : 2026-08-25, 07:50 UTC (exécution terminée ; durée ~15 min, 30 appels LLM séquentiels)
- **Provider** : webhook n8n → Claude (`https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation`), prompt `DICTEE_SYS` durci (commit `9544f46`)
- **Commande** :

```bash
LIDIA_DEBUG=1 LIDIA_WEBHOOK=https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation node eval/score.js
```

## Sortie intégrale et brute du script

```
Éval dictées (30 dictées, extracteur webhook) :
  mot-clé     5/5  (100 %)
  constantes  17/17  (100 %)
  observations 9/9  (100 %)
  icope       0/0  (100 %)
  post-its    5/5  (100 %)
  inventions  0
Éval dictées : OK.
```

Code de sortie : `0`.

Note : aucune ligne `✗`, `⚠ INVENTION` ni `[debug]` n'apparaît car le script ne les émet que pour les dictées en échec ou avec invention (`LIDIA_DEBUG` n'affiche les réponses brutes que pour ces cas) ; ce run n'en compte aucune — la sortie ci-dessus est donc bien la sortie complète.

## Verdict

**OK** — critères bloquants respectés :

- 0 invention (exigé : 0) ;
- constantes 100 % (exigé : ≥ 90 %) ;
- mot-clé 100 % (exigé : ≥ 90 %).
