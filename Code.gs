
/**
 * EUROMED — ENR08-V07
 * Réception des PDF en ligne et hors connexion.
 * Diagnostic persistant de chaque requête.
 */

const DESTINATAIRE = 'valentineuromed@gmail.com';
const NOM_EXPEDITEUR = 'EuroMed - Fiches de maintenance';
const CLE_DIAGNOSTIC = 'ENR08_DERNIER_DIAGNOSTIC';

function doGet() {
return ContentService
  .createTextOutput('ENR08-V07 : service actif')
  .setMimeType(ContentService.MimeType.TEXT);
}

function enregistrerDiagnostic_(diagnostic) {
  diagnostic.date = new Date().toISOString();

  PropertiesService.getScriptProperties().setProperty(
    CLE_DIAGNOSTIC,
    JSON.stringify(diagnostic, null, 2)
  );

  console.log('[ENR08-DIAGNOSTIC] ' +
    JSON.stringify(diagnostic));
}

function doPost(e) {
  const diagnostic = {
    statut: 'DEBUT',
    etapes: [],
    parametres: [],
    tailleCorps: null,
    tailleBase64: 0,
    taillePdfOctets: 0,
    destinataire: DESTINATAIRE,
    erreur: null
  };

  function etape(message) {
    diagnostic.etapes.push({
      heure: new Date().toISOString(),
      message: message
    });
    console.log('[ENR08] ' + message);
  }

  try {
    // Enregistrer immédiatement la réception.
    diagnostic.statut = 'REQUETE_RECUE';
    etape('doPost exécuté : début du traitement.');
    enregistrerDiagnostic_(diagnostic);

    if (!e || !e.parameter) {
      throw new Error('Objet de requête ou paramètres absents.');
    }

    const p = e.parameter;
    diagnostic.parametres = Object.keys(p);

    diagnostic.tailleCorps =
      e.postData && typeof e.postData.length === 'number'
        ? e.postData.length
        : null;

    etape('Paramètres reçus : ' +
      diagnostic.parametres.join(', '));

    etape('Taille du corps : ' + diagnostic.tailleCorps);

    const tokenAttendu = PropertiesService
      .getScriptProperties()
      .getProperty('APP_TOKEN');

    if (tokenAttendu && p.token !== tokenAttendu) {
      throw new Error('Token invalide ou absent.');
    }

    const base64 = p.pdf_base64 || '';
    diagnostic.tailleBase64 = base64.length;

    etape('Taille PDF base64 : ' + base64.length);

    if (!base64) {
      throw new Error(
        'PDF absent : le paramètre pdf_base64 est vide.'
      );
    }

    const nomFichier = sanitizeFilename_(
      p.filename || 'fiche-maintenance.pdf'
    );

    const octets = Utilities.base64Decode(base64);
    diagnostic.taillePdfOctets = octets.length;

    if (!octets.length) {
      throw new Error('Le PDF décodé est vide.');
    }

    const signature = octets.slice(0, 5)
      .map(function(b) {
        return String.fromCharCode(b);
      })
      .join('');

    if (signature !== '%PDF-') {
      throw new Error(
        'Le fichier reçu ne possède pas une signature PDF valide.'
      );
    }

    const pdf = Utilities.newBlob(
      octets,
      'application/pdf',
      nomFichier
    );

    etape('PDF vérifié : ' + nomFichier +
      ' (' + octets.length + ' octets).');

    const sujet =
      'Fiche de maintenance lit médicalisé' +
      (p.reference ? ' – ' + p.reference : '');

    const corps = [
      'Bonjour,',
      '',
      'Veuillez trouver ci-joint la fiche de maintenance.',
      '',
      'Client : ' + (p.client || ''),
      'Technicien : ' + (p.technicien || ''),
      'Date : ' + (p.date || ''),
      'Référence intervention : ' + (p.reference || ''),
      'N° série / parc : ' + (p.serie || ''),
      'Fichier : ' + nomFichier,
      '',
      'Cordialement,',
      'EuroMed'
    ].join('\n');

    diagnostic.statut = 'ENVOI_EMAIL_EN_COURS';
    enregistrerDiagnostic_(diagnostic);
    etape('Tentative d’envoi à ' + DESTINATAIRE);

    GmailApp.sendEmail(
      DESTINATAIRE,
      sujet,
      corps,
      {
        name: NOM_EXPEDITEUR,
        attachments: [pdf]
      }
    );

    diagnostic.statut = 'APPEL_GMAIL_TERMINE';
    etape('GmailApp.sendEmail terminé sans exception.');
    enregistrerDiagnostic_(diagnostic);

    return json_({
      ok: true,
      message: 'Demande de courriel traitée.',
      filename: nomFichier,
      pdfBytes: octets.length
    });

  } catch (err) {
    diagnostic.statut = 'ERREUR';
    diagnostic.erreur = err && err.stack
      ? String(err.stack)
      : String(err);

    console.error('[ENR08] ERREUR : ' + diagnostic.erreur);

    try {
      enregistrerDiagnostic_(diagnostic);
    } catch (erreurStockage) {
      console.error('Échec du stockage : ' + String(erreurStockage));
    }

    return json_({
      ok: false,
      error: String(err)
    });

  } finally {
    console.log('[ENR08] Fin doPost.');
  }
}

function json_(objet) {
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeFilename_(nom) {
  return String(nom)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120) || 'fiche-maintenance.pdf';
}

function afficherDernierDiagnosticEuroMed() {
  const valeur = PropertiesService
    .getScriptProperties()
    .getProperty(CLE_DIAGNOSTIC);

  console.log(valeur || 'Aucun diagnostic enregistré.');
}

function diagnosticMailEuroMed() {
  GmailApp.sendEmail(
    DESTINATAIRE,
    'Test diagnostic EuroMed',
    'Test envoyé le ' + new Date().toISOString() +
    '\nQuota restant : ' + MailApp.getRemainingDailyQuota()
  );

  console.log('Appel de test Gmail terminé.');
}

function testerStockageEuroMed() {
  const props = PropertiesService.getScriptProperties();

  props.setProperty(
    'ENR08_TEST_STOCKAGE',
    'Test effectué le ' + new Date().toISOString()
  );

  console.log(
    'Valeur enregistrée : ' +
    props.getProperty('ENR08_TEST_STOCKAGE')
  );
}

