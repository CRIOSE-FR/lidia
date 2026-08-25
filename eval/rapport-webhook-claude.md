# Rapport d'évaluation — dictées via webhook n8n (Claude)

- **Date** : 2026-08-25
- **Provider** : webhook n8n → Claude (`https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation`)
- **Commande exécutée** :

```bash
LIDIA_WEBHOOK=https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation node eval/score.js
```

## Sortie complète et brute

```
Erreur éval : webhook HTTP 403
```

## Diagnostic de l'erreur

Le 403 ne provient pas du webhook n8n lui-même mais de la politique réseau de
l'environnement d'exécution distant (proxy sortant). Vérifications effectuées :

- Sonde directe du webhook :

  ```
  curl -sS -X POST -H "Content-Type: application/json" \
    -d '{"text":"test","system":"test"}' \
    https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation
  → curl: (56) CONNECT tunnel failed, response 403
  ```

- Statut du proxy de l'environnement (`$HTTPS_PROXY/__agentproxy/status`),
  message d'erreur exact relevé :

  ```
  {
    "ts": "2026-08-25T07:07:11.114Z",
    "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "lidiaplan.app.n8n.cloud:443"
  }
  ```

Le domaine `lidiaplan.app.n8n.cloud` n'est pas autorisé par la politique réseau
de l'environnement (hôte hors allowlist). Aucune des 30 dictées n'a pu être
envoyée au webhook ; l'extraction distante n'a donc pas pu être évaluée.

## Verdict

**ÉCHEC** — erreur réseau : la connexion au webhook est bloquée par la
politique réseau de l'environnement (403 au CONNECT du proxy, hôte non
autorisé). Les critères bloquants (0 invention, ≥ 90 % d'exactitude sur
constantes et mot-clé) n'ont pas pu être mesurés : ce n'est pas un échec de
qualité d'extraction mais une impossibilité d'exécution.

Pour rejouer l'évaluation : autoriser le domaine `lidiaplan.app.n8n.cloud`
dans la politique réseau de l'environnement (ou exécuter la commande depuis un
poste ayant accès au webhook), puis relancer la commande ci-dessus.
