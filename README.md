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
