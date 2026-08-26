# Rapport d'évaluation — dictées v5.3.0 (chaîne réelle n8n → Claude)

- **Date** : 2026-08-26
- **Commit évalué** : `4f14b3a606b6d32f4fe19cd1aa76d5c600753628` — « v5.3.0 : la dictée pré-remplit la réfection de plaie (schéma fermé, ciblage, validation IDEL) », branche `claude/new-session-nrke97`
- **Webhook** : `https://lidiaplan.app.n8n.cloud/webhook/lidia-cotation`
- **Commande** : `LIDIA_WEBHOOK=… LIDIA_DEBUG=1 node eval/score.js`
- **Jeu d'éval** : `eval/dictees.json` — 35 dictées, dont les 5 dernières (ids 31–35) testent le nouveau champ `refection`

## Verdict global : ❌ ÉCHEC

**6 inventions détectées** (critère bloquant : 0 tolérée). Tous les autres critères sont au vert, y compris les seuils bloquants ≥ 90 % sur constantes et mot-clé (100 % chacun) et l'extraction des champs `refection` attendus (21/21).

## Scores par catégorie

| Catégorie | Score | % |
|---|---|---|
| Mot-clé | 5/5 | 100 % |
| Constantes | 17/17 | 100 % |
| Observations | 13/13 | 100 % |
| ICOPE | 0/0 | 100 % (aucun champ attendu dans le jeu) |
| Post-its | 5/5 | 100 % |
| **Réfections** (nouveau, ids 31–35) | **21/21** | **100 %** |
| **Inventions** | **6** | **bloquant** |

Lecture : tout ce qui est dicté est correctement extrait (aucun champ attendu manquant ou erroné, réfections comprises). L'échec vient exclusivement de champs **remplis sans avoir été dictés** — le webhook déduit au lieu d'extraire.

## Détail des inventions (avec réponses brutes LIDIA_DEBUG)

### Dictée #19 — 1 invention

- **Texte dicté** : « Pansement refait, plaie propre »
- **Attendu** : `obs.peau = "plaie"` uniquement (pas d'objet `refection`)
- **Invention** : `refection.pansement = "inchangé"`
- **Réponse brute** :
  ```json
  {"texte":"Réfection du pansement ; plaie d'aspect propre.","mot":null,"cst":null,"obs":{"douleur":"","chute":"","confusion":"","peau":"plaie","surcharge":"","observance":""},"icope":null,"postit":null,"refection":{"pansement":"Inchangé"}}
  ```
- **Analyse** : « pansement refait » ne dit rien du type de pansement ; le modèle déduit « Inchangé » du seul fait que le pansement a été refait. Rien dans la dictée ne décrit la réfection → aucun objet `refection` ne devait être ouvert.

### Dictée #29 — 2 inventions

- **Texte dicté** : « Escarre sacrée stade 2, pansement fait, photo prise »
- **Attendu** : `obs.peau = "escarre"` uniquement (pas d'objet `refection`)
- **Inventions** : `refection.localisation = "sacrum"`, `refection.lateralite = "médian"`
- **Réponse brute** :
  ```json
  {"texte":"Réfection de l'escarre sacrée stade 2 ; photo prise lors du soin.","mot":null,"cst":null,"obs":{"douleur":"","chute":"","confusion":"","peau":"escarre","surcharge":"","observance":""},"icope":null,"postit":null,"refection":{"localisation":"Sacrum","lateralite":"Médian"}}
  ```
- **Analyse** : la dictée mentionne bien « sacrée », mais elle ne décrit aucune réfection (lit, exsudat, ISO, pansement…) — l'attendu ne comporte donc pas d'objet `refection`. Surtout, `lateralite = "Médian"` n'est jamais dicté : c'est une déduction anatomique (le sacrum est médian), exactement le type d'inférence que le schéma fermé interdit.

### Dictée #32 — 1 invention

- **Texte dicté** : « Escarre du sacrum, lit nécrotique, exsudat abondant, écoulement purulent et rougeur extensive autour »
- **Attendu** : `obs.peau = "escarre"` + `refection = {lit: "Nécrotique", exsudat: "Abondant", iso: {ecoulement_purulent: true, rougeur_extensive: true}, localisation: "Sacrum"}`
- **Invention** : `refection.lateralite = "médian"` (tout le reste est correct : 6/6 champs attendus)
- **Réponse brute** :
  ```json
  {"texte":"Réfection de l'escarre sacrée : lit nécrotique, exsudat abondant, avec écoulement purulent et rougeur extensive périlésionnelle.","mot":null,"cst":null,"obs":{"douleur":"","chute":"","confusion":"","peau":"escarre","surcharge":"","observance":""},"icope":null,"postit":null,"refection":{"lit":"Nécrotique","exsudat":"Abondant","iso":{"rougeur_extensive":true,"ecoulement_purulent":true},"localisation":"Sacrum","lateralite":"Médian"}}
  ```
- **Analyse** : même déduction anatomique que #29 — la latéralité n'est pas dictée, le modèle l'infère de « sacrum ».

### Dictée #34 — 2 inventions

- **Texte dicté** : « Pansement refait ce matin, rien de particulier, patient souriant »
- **Attendu** : rien (`obs` null, pas de `refection`) — c'est précisément la dictée-piège du jeu 31–35
- **Inventions** : `obs.peau = "plaie"`, `refection.pansement = "inchangé"`
- **Réponse brute** :
  ```json
  {"texte":"Réfection du pansement ce matin sans particularité notable ; patient souriant.","mot":null,"cst":null,"obs":{"douleur":"","chute":"","confusion":"","peau":"plaie","surcharge":"","observance":""},"icope":null,"postit":null,"refection":{"pansement":"Inchangé"}}
  ```
- **Analyse** : « rien de particulier » devait produire une extraction vide. Le modèle déduit une plaie (`obs.peau`) et un pansement inchangé du seul mot « pansement ». Double invention sur la dictée conçue pour tester exactement ce cas.

## Synthèse des écarts

Les 6 inventions relèvent de **3 motifs récurrents**, tous côté prompt du workflow n8n (l'extraction des champs réellement dictés est, elle, parfaite) :

1. **`lateralite` déduite de la localisation** (#29, #32) : « sacrum/sacrée » → « Médian ». La latéralité ne doit être remplie que si elle est dictée (« gauche », « droit »).
2. **`refection.pansement = "Inchangé"` déduit de « pansement refait »** (#19, #34) : refaire un pansement ne dit pas que le protocole est inchangé.
3. **Objet `refection` (et `obs.peau`) ouvert dès qu'un pansement est mentionné** (#19, #29, #34) : le modèle transforme « pansement fait » en réfection documentée, alors que seule une dictée décrivant la réfection (lit, exsudat, ISO, surface, pansement…) doit la produire.

À noter : les 4 dictées 31–35 avec réfection attendue (31, 32, 33, 35) sont extraites à 100 % — le nouveau champ fonctionne ; c'est la retenue (« ne rien remplir qui ne soit pas dicté ») qui manque.

## Piste de correction (hors périmètre de ce rapport)

Renforcer `DICTEE_SYS` dans le workflow n8n (`n8n_lidia_cotation.json`) avec des interdictions explicites : ne jamais déduire `lateralite` d'une localisation anatomique ; ne remplir `refection` que si la dictée décrit le contenu de la réfection ; « pansement refait » seul ⇒ extraction vide (ni `obs.peau`, ni `refection`). Les dictées #19, #29 et #34 constituent des exemples négatifs directement réutilisables en few-shot.
