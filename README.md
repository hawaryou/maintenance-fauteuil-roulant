# ENR10 — Maintenance fauteuil roulant

Version avec :
- bouton MENU identique au fichier de référence, en haut à gauche ;
- lien vers https://hawaryou.github.io/HUB-euromed/ ;
- Apps Script ENR10 indépendant ;
- objet e-mail conforme à la demande ;
- gestion d'un ou plusieurs clients ;
- envoi par formulaire vers une iframe pour éviter le problème `fetch/no-cors`.

## Déploiement Apps Script

1. Créer un NOUVEAU projet Google Apps Script.
2. Copier `Code.gs`.
3. Déployer > Nouveau déploiement > Application Web.
4. Exécuter en tant que : Moi.
5. Qui a accès : Toute personne disposant du lien.
6. Autoriser `MailApp` lorsque Google le demande.
7. Copier l'URL `/exec`.
8. La placer dans `config.js` à la place de `COLLEZ_ICI_L_URL_DE_VOTRE_NOUVEAU_DEPLOIEMENT_ENR10_EXEC`.
9. Publier le contenu web (GitHub Pages).

Le destinataire interne est `valentineuromed@gmail.com`.
