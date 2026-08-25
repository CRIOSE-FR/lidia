# Rapport d'évaluation — dictées LIDIA via webhook n8n (Claude)

- **Date et heure** : 2026-08-25 07:24 UTC
- **Provider** : webhook n8n (`https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation`) → Claude
- **Commande** :

```bash
LIDIA_WEBHOOK=https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation node eval/score.js
```

## Sortie intégrale et brute du script

```
Erreur éval : webhook HTTP 403
```

Code de sortie : `1`.

## Verdict : ÉCHEC (non exécutable — blocage réseau de l'environnement)

L'évaluation n'a pas pu être exécutée : le proxy réseau de l'environnement d'exécution refuse la connexion sortante vers l'hôte du webhook. Ce n'est pas un refus du webhook n8n lui-même (celui-ci est confirmé actif) : le tunnel TLS est rejeté avant d'atteindre n8n.

Preuves :

- Sonde `curl -X POST` directe vers le webhook :

```
curl: (56) CONNECT tunnel failed, response 403
```

- État du proxy de l'environnement (`$HTTPS_PROXY/__agentproxy/status`, extrait `recentRelayFailures`) :

```json
{
  "ts": "2026-08-25T07:24:39.184Z",
  "kind": "connect_rejected",
  "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  "host": "lidiaplan.app.n8n.cloud:443"
}
```

Le 403 renvoyé au script correspond donc à un refus de politique du proxy (host non autorisé dans l'allowlist réseau de la session), noté tel quel conformément à la consigne.

## Critères bloquants (spec v5)

Non évaluables sur cette exécution — aucune dictée n'a pu être soumise au webhook :

- 0 invention : **non évalué**
- ≥ 90 % constantes : **non évalué**
- ≥ 90 % mot-clé : **non évalué**

Aucune ligne de détail (`✗` / `⚠ INVENTION`) n'a été produite : le script s'est arrêté avant la boucle d'évaluation, à la première requête HTTP.

## Reproduction

Pour une exécution réelle, relancer la commande ci-dessus depuis un environnement dont la politique réseau autorise `lidiaplan.app.n8n.cloud:443` en sortie.
