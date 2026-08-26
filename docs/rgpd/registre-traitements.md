# Registre des activités de traitement — LIDIA Cotation (document RGPD n° 1)

> Modèle à compléter et à tenir au cabinet (art. 30 RGPD). En MODE TEST, seuls des
> patients fictifs sont saisis : ce registre est préparé pour la bascule en production.

## Responsable de traitement
- Cabinet infirmier : _______________ (adresse, contact)
- Référent du traitement : _______________

## Traitement : recueil de données de soins et de recherche en tournée
- **Finalités** : coordination des soins (transmissions, post-its), suivi de la
  patientèle (fraîcheur socle/constantes/photo/ICOPE), recherche sur données
  pseudonymisées (export P001…) dans le cadre de la méthodologie de référence **MR-004**.
- **Base légale** : mission d'intérêt public / recherche n'impliquant pas la personne
  humaine (MR-004), information individuelle préalable (document n° 3).
- **Catégories de données** : identité (initiales), année de naissance, sexe, commune,
  situation (vit seul, aidant, institution), pathologies (liste fermée), traitements
  (nombre de médicaments), autonomie, transmissions de soins (constantes,
  observations, événements, ICOPE, photos de plaies tracées sans image), passages.
- **Personnes concernées** : patients pris en charge par le cabinet.
- **Destinataires** : équipe de soins du cabinet ; données pseudonymisées uniquement
  pour l'exploitation de recherche. La table de correspondance code↔patient ne quitte
  jamais l'application.
- **Durées de conservation** : dossier de soins selon la réglementation en vigueur ;
  brouillons purgés à la validation ; post-its PERSO supprimables à tout moment.
- **Hébergement** : local (appareil de l'IDEL). Bascule en production conditionnée à
  un hébergement certifié HDS (`DATA_MODE = "production"`).
- **Mesures de sécurité** : données 100 % locales, aucun identifiant direct dans les
  exports, post-its PERSO exclus de tout export, verrouillage de l'appareil,
  géolocalisation des passages désactivée par défaut (opt-in).

## Journal des mises à jour du registre
| Date | Modification | Par |
|------|--------------|-----|
|      |              |     |
