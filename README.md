# ENR10-V03 — Maintenance fauteuil roulant manuel

Application web mobile reprenant le style et les options de l’application de maintenance des lits :

- contrôles visuel et fonctionnel issus de la fiche ENR10-V03 ;
- réponses Non applicable, Conforme et Non conforme ;
- scan QR Code, Data Matrix, Code 128 et EAN-13, ainsi que lecture depuis une photo ;
- choix de zoom et autofocus selon les capacités du téléphone ;
- certificat PDF avec conformité en vert et non-conformité en rouge ;
- la non-conformité « Propreté générale » ne rend pas à elle seule le fauteuil globalement non conforme ;
- niveau d’obsolescence visible sur le certificat ;
- mode normal ou tournée de plusieurs fauteuils avec une seule signature client ;
- téléchargement du PDF et envoi par e-mail via Google Apps Script.

## Déploiement

Publier les fichiers statiques sur GitHub Pages. Le scan caméra nécessite HTTPS. Le bouton e-mail utilise l’URL Apps Script configurée dans `config.js` et `app.js`; déployer `Code.gs` comme application Web Google Apps Script si un nouveau backend est souhaité.

## Nouveautés — aperçu PDF et confidentialité

- Le bouton « Aperçu du PDF » ouvre le PDF dans une fenêtre de contrôle avant transmission ; téléchargement et confirmation d'envoi sont accessibles depuis cette fenêtre.
- Le menu HUB EuroMed est placé en haut à droite avec un style graphique adapté au mobile.
- Une notice de confidentialité est intégrée à la page.

### Points RGPD à valider avant mise en production

La présence d'une notice ne constitue pas à elle seule une garantie de conformité. EuroMed doit notamment renseigner l'identité et les coordonnées du responsable de traitement, déterminer la base légale et les durées de conservation, définir les personnes autorisées à accéder aux fiches, traiter les demandes d'exercice des droits et vérifier les rôles/contrats des prestataires utilisés (Google Apps Script, Gmail, GitHub Pages et CDN externes). Il convient également de vérifier si les données saisies peuvent contenir des données de santé et, le cas échéant, d'adapter le cadre de traitement et les mesures de sécurité. Ne pas considérer le projet comme validé juridiquement avant ces vérifications.
