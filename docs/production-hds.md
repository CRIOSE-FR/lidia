# Passage en production — hébergement HDS et conformité CNIL exemplaire

> **Version 1.0 — 2026-08-25.** Feuille de route pour basculer `DATA_MODE` de `"test"`
> à `"production"` (vrais patients). Synthèse d'une recherche documentaire menée le
> 25/08/2026 (textes en vigueur, FAQ ANS, référentiels CNIL, offres des hébergeurs
> certifiés). Les points incertains sont signalés ; la validation finale relève d'un
> juriste santé/données ou d'un DPO.

## 1. Ce qui est DÉJÀ conforme (et à valoriser dans le dossier CNIL)

L'architecture « local-first » de LIDIA change tout : **les données patients ne
quittent jamais l'appareil de l'IDEL** (localStorage), qui les conserve **pour son
propre compte**.

- **Art. L.1111-8 CSP** : la certification HDS ne s'impose qu'à celui qui héberge des
  données de santé **pour le compte de tiers**. Le professionnel qui conserve ses
  données lui-même n'y est pas soumis (FAQ ANS).
- **Netlify (ou tout hébergeur du site statique)** ne sert que du code : ce n'est pas
  un hébergement de données de santé — **à condition qu'aucune donnée de santé ne
  l'atteigne jamais** (pas de formulaire, pas d'analytics, pas de donnée en URL ; à
  documenter dans l'AIPD). *Point signalé : interprétation convergente ANS/CNIL
  (apps mobiles santé), pas de position publiée sur le cas exact « web-app +
  localStorage » — à faire confirmer par le DPO.*
- Atouts existants à mettre en avant : minimisation (export sans texte libre),
  pseudonymisation stable (P001…, table jamais exportée), schéma IA fermé « zéro
  invention » avec validation humaine, traçage des refus, dictionnaire de données
  versionné.

## 2. Le maillon NON conforme : la dictée IA

Le texte dicté est une **donnée de santé**, potentiellement identifiante. Or :

- **n8n.cloud stocke** les données d'exécution des workflows (payloads inclus)
  7 à 30 jours sur son infrastructure — c'est un hébergement de données de santé
  **sans certification HDS** → contraire à L.1111-8. Le DPA/SOC 2 de n8n ne
  remplace pas la HDS : les deux régimes se cumulent.
- **L'API Anthropic directe** : DPA solide, no-training par défaut, mais **inférence
  exclusivement aux États-Unis** (pas de résidence UE) et pas de certification HDS
  → à exclure pour des dictées identifiantes.
- Le **décret n° 2026-209 du 24/03/2026** (loi SREN) impose en plus un stockage
  exclusivement UE/EEE pour les données sous HDS.

**Conclusion : c'est ce flux, et lui seul, qu'il faut reconstruire.**

## 3. Architecture cible recommandée

### Option recommandée (exemplaire et pragmatique)

1. **n8n auto-hébergé sur Scalingo** (PaaS français, Strasbourg) — certifié HDS sur
   les **6 activités** du référentiel v2, **sans surcoût** (signature de l'annexe
   contractuelle « Hébergement de Données de Santé »), ordre de grandeur
   **15-40 €/mois**. Le workflow `n8n_lidia_cotation.json` existant fonctionne tel
   quel en auto-hébergé ; désactiver la journalisation des exécutions (payloads).
   Ce serveur reste aussi le gardien des clés API (jamais dans le frontend).
2. **Claude via Amazon Bedrock, verrouillé UE** — profil d'inférence `eu.anthropic.*`
   ou région unique `eu-west-3` (Paris). AWS est certifié HDS sur 24 régions dont
   Paris, avec no-training et prompts non partagés avec Anthropic. **Avant de
   contractualiser** : (a) télécharger l'attestation HDS via AWS Artifact et vérifier
   que Bedrock figure au périmètre du certificat ; (b) signer le contrat HDS AWS et
   le DPA ; (c) noter que l'activité 5 (administration du SI) est exclue du
   certificat AWS — elle incombe au client ou à un infogéreur certifié.
3. **Pseudonymisation côté client avant envoi** : l'app retire le nom du patient du
   texte dicté avant tout appel IA (implémenté en v5.1.2, `anonymiserDictee()`), et
   n'envoie jamais nom/adresse avec la requête.

### Variante « exemplarité maximale » (100 % France)

Mistral (poids ouverts) **auto-hébergé sur la même infra HDS** — La Plateforme
Mistral n'est PAS certifiée HDS, seul l'auto-hébergement est défendable. Coût GPU
plus élevé, et **qualité d'extraction à revalider** avec le jeu d'éval bloquant du
projet (`LIDIA_WEBHOOK=… node eval/score.js` : 0 invention, ≥ 90 % constantes)
avant tout arbitrage.

### Alternatives écartées

- API Anthropic directe (inférence US, pas de HDS) ; maintien de n8n.cloud (UE mais
  non HDS, stockage des payloads) ; Google Vertex AI (HDS Google OK mais inclusion
  de Vertex au périmètre non confirmée, Claude servi hors de France) ; OVHcloud /
  Clever Cloud (certifiés, mais offres et tarifs dimensionnés entreprise :
  ~200-300 €/mois chez Clever, support Business exigé chez OVH).

## 4. Démarches CNIL (dans l'ordre)

1. **Rester en `DATA_MODE="test"`** tant que les étapes suivantes ne sont pas
   achevées (règle bloquante déjà inscrite dans CLAUDE.md).
2. **Conformité du traitement « soins »** : référentiel CNIL cabinets médicaux et
   paramédicaux (délib. 2020-081) — registre des traitements (obligatoire malgré la
   taille du cabinet : données sensibles + traitement non occasionnel), conservation
   20 ans (5 actifs + 15 archive), information de cabinet, procédure droits et
   violation (72 h). Ajouter verrouillage d'accès et sauvegarde maîtrisée de
   l'appareil.
3. **Désigner un DPO** (externe/mutualisé, ex. via URPS) et le déclarer à la CNIL —
   lecture prudente exigée pour la MR-004. *Point à confirmer sur le texte intégral
   de la délib. 2018-155 : caractère systématique ou conditionnel du DPO.*
4. **Cadrer la recherche en projets délimités sous MR-004** (protocole écrit,
   finalité, durée, intérêt public) — pas en « entrepôt de données » (référentiel
   EDS 2021 réservé aux missions d'intérêt public, hors de portée d'un cabinet).
   La MR-004 est ouverte aux acteurs privés, donc à un cabinet IDEL.
5. **Réaliser l'AIPD** (obligatoire : données de santé + personnes vulnérables ;
   outil PIA gratuit de la CNIL). Y documenter le local-first, la pseudonymisation,
   le circuit dictée, et le fait que Netlify ne reçoit aucune donnée de santé.
6. **Basculer la chaîne technique** (section 3) et signer les **contrats art. 28**
   avec chaque sous-traitant (Scalingo — annexe HDS ; AWS — contrat HDS + DPA).
7. **Information individuelle préalable** de chaque patient : note remise en main
   propre (finalités soins + recherche, DPO, durées — 20 ans soins / 2 ans après
   publication pour la recherche —, droits, opposition à tout moment sans
   justification). Ne jamais invoquer la dérogation d'information (art. 14.5.b) :
   elle fait sortir de la MR-004.
8. **Formalités** : engagement de conformité MR-004 en ligne (cnil.fr, une fois),
   puis **enregistrement de chaque étude** au répertoire public du Health Data Hub
   (demarche.numerique.gouv.fr) avant démarrage.
9. **Documentation vivante** : registre, AIPD révisée à chaque évolution (nouveau
   provider IA, nouveau champ — en cohérence avec `data_dictionary.md`).

## 5. Ce qui relève d'un professionnel du droit

Qualification d'intérêt public du projet ; arbitrage final MR-004 vs autorisation ;
rédaction/négociation des contrats art. 28 et clauses de transfert ; validation de
l'AIPD et de la note d'information ; vérification écrite du périmètre HDS réel des
prestataires (attestations AWS Artifact, annexe Scalingo).

## 6. Conditions techniques du passage `DATA_MODE="production"`

Le flag ne bascule que quand TOUTES ces cases sont cochées :

- [ ] n8n auto-hébergé sur hébergeur certifié HDS (annexe HDS signée), logs
      d'exécution désactivés, webhook de l'app repointé
- [ ] Inférence IA en UE sur infrastructure certifiée HDS (Bedrock UE vérifié via
      AWS Artifact + contrat HDS + DPA, ou Mistral auto-hébergé validé par l'éval)
- [ ] Éval dictées re-passée au vert sur la nouvelle chaîne (0 invention, ≥ 90 %)
- [ ] AIPD réalisée et validée ; registre à jour ; DPO désigné
- [ ] Engagement MR-004 déposé + étude enregistrée au répertoire public
- [ ] Note d'information patients prête et distribuée
- [ ] Vérifié : aucune donnée de santé ne part vers l'hébergeur du site statique

## Journal des versions

| Version | Date | Changement |
|---|---|---|
| 1.0 | 2026-08-25 | Version initiale (recherche du 25/08/2026 : L.1111-8, référentiel HDS v2 2024, décret 2026-209, MR-004, AIPD, comparatif hébergeurs et providers IA). |
