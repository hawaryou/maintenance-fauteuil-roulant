/**
 * ENR10-V04 — Réception et envoi des fiches PDF fauteuil roulant manuel.
 * Compatible avec la retransmission d'une fiche enregistrée hors ligne,
 * lorsque l'application retrouve une connexion Internet.
 *
 * Déploiement : application Web, exécutée en tant que propriétaire.
 */

const DESTINATAIRE_ENR10 = 'valentineuromed@gmail.com';
const NOM_EXPEDITEUR_ENR10 = 'EuroMed - Maintenance fauteuil roulant';
const DIAGNOSTIC_ENR10 = 'ENR10_DERNIER_DIAGNOSTIC';

/**
 * Vérification du service.
 */
function doGet() {
  return ContentService
    .createTextOutput('ENR10-V04 : service actif — fauteuil roulant manuel')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Réception d'une fiche PDF et envoi par courriel.
 */
function doPost(e) {
  const debut = new Date();

  try {
    const p = lireParametresENR10_(e);

    // Vérification facultative du jeton de sécurité.
    const tokenAttendu = PropertiesService
      .getScriptProperties()
      .getProperty('APP_TOKEN');

    if (tokenAttendu && String(p.token || '') !== tokenAttendu) {
      throw new Error('Token invalide.');
    }

    let base64 = String(p.pdf_base64 || '').trim();

    // Accepte également un PDF transmis sous forme de data URI.
    if (base64.indexOf('base64,') !== -1) {
      base64 = base64.substring(base64.indexOf('base64,') + 7);
    }

    if (!base64) {
      throw new Error(
        'PDF manquant : le champ pdf_base64 n’a pas été reçu.'
      );
    }

    if (base64.length > 11000000) {
      throw new Error(
        'PDF trop volumineux pour cet envoi.'
      );
    }

    // Contrôle et préparation du fichier PDF.
    let donneesPDF;

    try {
      donneesPDF = Utilities.base64Decode(base64);
    } catch (decodeError) {
      throw new Error('Décodage du PDF impossible.');
    }

    if (
      !donneesPDF ||
      donneesPDF.length < 5 ||
      donneesPDF[0] !== 37 ||
      donneesPDF[1] !== 80 ||
      donneesPDF[2] !== 68 ||
      donneesPDF[3] !== 70 ||
      donneesPDF[4] !== 45
    ) {
      throw new Error(
        'Le fichier reçu ne possède pas une signature PDF valide.'
      );
    }

    const nom = nomFichierENR10_(
      p.filename || 'ENR10-V03-fauteuil-roulant.pdf'
    );

    const blob = Utilities.newBlob(
      donneesPDF,
      'application/pdf',
      nom
    );

    const client = texteENR10_(p.client, 250);
    const technicien = texteENR10_(p.technicien, 180);
    const date = texteENR10_(p.date, 40);
    const reference = texteENR10_(p.reference, 180);
    const serie = texteENR10_(p.serie, 250);

    const sujet =
      'Maintenance fauteuil roulant manuel — ENR10-V04' +
      (reference ? ' — ' + reference : '');

    const corps = [
      'Bonjour,',
      '',
      'Veuillez trouver ci-joint la fiche de maintenance fauteuil roulant manuel ENR10.',
      '',
      'Client / établissement : ' + client,
      'Technicien : ' + technicien,
      'Date : ' + date,
      'Référence intervention : ' + reference,
      'N° série / parc : ' + serie,
      '',
      'Fichier : ' + nom,
      'Taille du PDF : ' + donneesPDF.length + ' octets',
      '',
      'Message généré automatiquement par EuroMed.',
      '',
      'Cordialement,',
      'EuroMed'
    ].join('\n');

    // Envoi du PDF en pièce jointe.
    MailApp.sendEmail({
      to: DESTINATAIRE_ENR10,
      subject: sujet,
      body: corps,
      name: NOM_EXPEDITEUR_ENR10,
      attachments: [blob]
    });

    // Diagnostic : l'appel d'envoi par MailApp s'est terminé sans erreur.
    enregistrerDiagnosticENR10_({
      statut: 'ENVOI_MAIL_OK',
      message: 'MailApp.sendEmail terminé sans erreur.',
      fichier: nom,
      destinataire: DESTINATAIRE_ENR10,
      client: client,
      reference: reference,
      taillePDF: donneesPDF.length,
      date: new Date().toISOString(),
      dureeMs: new Date().getTime() - debut.getTime()
    });

    console.log(
      'ENR10 : envoi MailApp terminé — ' + nom +
      ' — ' + donneesPDF.length + ' octets.'
    );

    return jsonENR10_({
      ok: true,
      code: 'ENR10',
      message: 'Demande de traitement terminée sans erreur côté MailApp.',
      filename: nom
    });

  } catch (err) {
    const message = String(
      err && err.message ? err.message : err
    );

    enregistrerDiagnosticENR10_({
      statut: 'ERREUR',
      message: message,
      date: new Date().toISOString(),
      dureeMs: new Date().getTime() - debut.getTime()
    });

    console.error('ENR10 — ÉCHEC : ' + message);

    return jsonENR10_({
      ok: false,
      code: 'ENR10',
      error: message
    });
  }
}

/**
 * Lit les paramètres du formulaire.
 * Prend en charge les paramètres Apps Script habituels,
 * ainsi qu'un corps JSON si la requête en utilise un.
 */
function lireParametresENR10_(e) {
  if (!e) {
    throw new Error('Requête absente.');
  }

  const p = {};

  if (e.parameter) {
    Object.keys(e.parameter).forEach(function (cle) {
      p[cle] = e.parameter[cle];
    });
  }

  if (e.parameters) {
    Object.keys(e.parameters).forEach(function (cle) {
      if (p[cle] === undefined && e.parameters[cle]) {
        p[cle] = e.parameters[cle][0];
      }
    });
  }

  if (e.postData && e.postData.contents) {
    const contenu = e.postData.contents;
    const type = String(e.postData.type || '').toLowerCase();

    if (
      type.indexOf('application/json') !== -1 ||
      contenu.trim().charAt(0) === '{'
    ) {
      try {
        const objet = JSON.parse(contenu);

        Object.keys(objet).forEach(function (cle) {
          if (p[cle] === undefined) {
            p[cle] = objet[cle];
          }
        });
      } catch (err) {
        console.warn('ENR10 : corps JSON non interprétable.');
      }
    }
  }

  return p;
}

/**
 * Réponse JSON.
 */
function jsonENR10_(objet) {
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Nettoyage des champs de texte.
 */
function texteENR10_(valeur, maximum) {
  return String(valeur || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maximum);
}

/**
 * Nettoyage du nom de fichier.
 */
function nomFichierENR10_(valeur) {
  return String(valeur || 'ENR10-V03.pdf')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120) || 'ENR10-V03.pdf';
}

/**
 * Sauvegarde du dernier diagnostic dans les propriétés du script.
 */
function enregistrerDiagnosticENR10_(diagnostic) {
  try {
    PropertiesService
      .getScriptProperties()
      .setProperty(
        DIAGNOSTIC_ENR10,
        JSON.stringify(diagnostic)
      );
  } catch (err) {
    console.error(
      'ENR10 : impossible de sauvegarder le diagnostic : ' + err
    );
  }
}

/**
 * À lancer manuellement depuis Apps Script pour lire
 * le dernier résultat enregistré.
 */
function afficherDernierDiagnosticENR10() {
  const resultat = PropertiesService
    .getScriptProperties()
    .getProperty(DIAGNOSTIC_ENR10);

  console.log(
    resultat || 'Aucun diagnostic ENR10 enregistré.'
  );

  return resultat || 'Aucun diagnostic ENR10 enregistré.';
}
