# Rapport d'évaluation — dictées via webhook n8n (Claude)

- **Date et heure** : 2026-08-25, 07:20 UTC
- **Provider** : webhook n8n → Claude (`https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation`)
- **Commande exécutée** :

```bash
LIDIA_WEBHOOK=https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation node eval/score.js
```

## Sortie intégrale et brute du script

```
Erreur éval : webhook HTTP 403
```

Aucune ligne par dictée (✗ ou ⚠ INVENTION) n'a été produite : le script s'est
arrêté avant toute évaluation, aucune requête n'ayant abouti.

## Diagnostic de l'erreur

Le domaine `lidiaplan.app.n8n.cloud` devait avoir été ajouté à la politique
réseau de l'environnement, mais le blocage persiste au moment de l'exécution.
Le 403 ne provient pas du webhook n8n : c'est le proxy sortant de
l'environnement qui refuse d'ouvrir le tunnel vers l'hôte. Vérifications
effectuées lors de cette exécution :

- Sonde directe du webhook :

  ```
  curl -sS -X POST -H "Content-Type: application/json" \
    -d '{"type":"dictee","texte":"test"}' \
    https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation
  → curl: (56) CONNECT tunnel failed, response 403
  ```

- Corps exact de la réponse 403 du proxy au CONNECT :

  ```
  request blocked: no rule or allowlist entry allows host "lidiaplan.app.n8n.cloud"
  ```

- Statut du proxy (`$HTTPS_PROXY/__agentproxy/status`), échecs relevés pendant
  cette exécution :

  ```
  {
    "ts": "2026-08-25T07:19:31.266Z",
    "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "lidiaplan.app.n8n.cloud:443"
  }
  ```

L'hôte `lidiaplan.app.n8n.cloud` reste hors allowlist du proxy. Aucune dictée
du jeu d'éval n'a pu être envoyée au webhook ; l'extraction distante n'a donc
pas pu être évaluée. Conformément à la consigne, aucune nouvelle tentative
n'a été insistée après confirmation du blocage.

## Verdict

**ÉCHEC** — impossibilité d'exécution (blocage réseau) : la connexion au
webhook est refusée par la politique réseau de l'environnement (403 au CONNECT
du proxy, hôte hors allowlist, malgré l'ajout annoncé du domaine). Les critères
bloquants (0 invention, ≥ 90 % d'exactitude sur constantes et mot-clé) n'ont
pas pu être mesurés : ce n'est pas un échec de qualité d'extraction mais une
impossibilité d'atteindre le webhook.

Pour rejouer l'évaluation : vérifier que l'entrée d'allowlist pour
`lidiaplan.app.n8n.cloud` est bien effective dans la politique réseau de
l'environnement (une session existante peut nécessiter un redémarrage pour
prendre en compte la nouvelle politique), ou exécuter la commande depuis un
poste ayant accès au webhook, puis relancer la commande ci-dessus.
