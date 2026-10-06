# ENR10 — Maintenance fauteuil roulant

Cette version ajoute :
- un menu de navigation en haut à gauche, dans le même style visuel EuroMed que l'en-tête de la fiche ;
- la possibilité de saisir un ou plusieurs noms dans « Client / patient(s) » ;
- un backend Google Apps Script dédié à ENR10, séparé du backend des lits ;
- un objet d'e-mail avec le nom du client/patient pour un fauteuil ;
- un objet générique sans nom pour une tournée de plusieurs fauteuils ;
- la liste des clients/patients regroupée dans le corps du mail pour les tournées.

## Apps Script

1. Créer un nouveau projet Google Apps Script.
2. Copier le contenu de `Code.gs`.
3. Déployer comme **Application Web** avec accès autorisé à l'utilisateur qui doit envoyer les mails.
4. Copier l'URL `/exec` du déploiement dans `config.js` à la place de la chaîne vide.
5. Si `APP_TOKEN` est utilisé, définir la même valeur dans les propriétés du script et dans `app.js`.

Destinataire configuré : `valentineuromed@gmail.com`.

## Menu

Les liens du menu sont relatifs au projet actuel. Si les deux applications sont hébergées dans des dépôts GitHub Pages distincts, adapter le lien « Maintenance lit médicalisé » dans `index.html` avec l'URL publique réelle de la fiche lit.
