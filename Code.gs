/**
 * EUROMED — ENR10-V05
 * Réception et envoi des fiches PDF de maintenance fauteuil roulant,
 * en ligne ou après remise en réseau de la file d'attente hors connexion.
 *
 * Déploiement : application Web exécutée en tant que propriétaire du script.
 */

const DESTINATAIRE_ENR10 = 'valentineuromed@gmail.com';
const NOM_EXPEDITEUR_ENR10 = 'EuroMed - Maintenance fauteuil roulant';
const CLE_DIAGNOSTIC_ENR10 = 'ENR10_DERNIER_DIAGNOSTIC';

function doGet() {
  return ContentService
    .createTextOutput('ENR10-V05 : service actif')
    .setMimeType(ContentService.MimeType.TEXT);
}

function enregistrerDiagnosticENR10_(diagnostic) {
  diagnostic.date = new Date().toISOString();
  PropertiesService.getScriptProperties().setProperty(
    CLE_DIAGNOSTIC_ENR10,
    JSON.stringify(diagnostic, null, 2)
  );
  console.log('[ENR10-DIAGNOSTIC] ' + JSON.stringify(diagnostic));
}

function doPost(e) {
  const diagnostic = {
    service: 'ENR10-V05',
    statut: 'DEBUT',
    etapes: [],
    parametres: [],
    tailleCorps: null,
    tailleBase64: 0,
    taillePdfOctets: 0,
    destinataire: DESTINATAIRE_ENR10,
    erreur: null
  };

  function etape(message) {
    diagnostic.etapes.push({
      heure: new Date().toISOString(),
      message: message
    });
    console.log('[ENR10] ' + message);
  }

  try {
    diagnostic.statut = 'REQUETE_RECUE';
    etape('doPost exécuté : début du traitement.');
    enregistrerDiagnosticENR10_(diagnostic);

    if (!e || !e.parameter) {
      throw new Error('Aucune donnée reçue : paramètres de requête absents.');
    }

    const p = e.parameter;
    diagnostic.parametres = Object.keys(p);
    diagnostic.tailleCorps =
      e.postData && typeof e.postData.contents === 'string'
        ? e.postData.contents.length
        : null;

    etape('Paramètres reçus : ' + diagnostic.parametres.join(', '));
    etape('Taille du corps : ' + diagnostic.tailleCorps);

    const tokenAttendu = PropertiesService
      .getScriptProperties()
      .getProperty('APP_TOKEN');

    if (tokenAttendu && p.token !== tokenAttendu) {
      throw new Error('Token invalide ou absent.');
    }

    const base64 = String(p.pdf_base64 || '');
    diagnostic.tailleBase64 = base64.length;
    etape('Taille PDF base64 : ' + base64.length);

    if (!base64) {
      throw new Error('PDF absent : le paramètre pdf_base64 est vide.');
    }

    const nomFichier = sanitizeFilenameENR10_(
      p.filename || 'maintenance-fauteuil-roulant.pdf'
    );

    const octets = Utilities.base64Decode(base64);
    diagnostic.taillePdfOctets = octets.length;

    if (octets.length < 5) {
      throw new Error('Le PDF décodé est vide ou trop court.');
    }

    const signature = octets.slice(0, 5).map(function(b) {
      return String.fromCharCode(b);
    }).join('');

    if (signature !== '%PDF-') {
      throw new Error('Le fichier reçu ne possède pas une signature PDF valide.');
    }

    const pdf = Utilities.newBlob(octets, 'application/pdf', nomFichier);
    etape('PDF vérifié : ' + nomFichier + ' (' + octets.length + ' octets).');

    const client = texteENR10_(p.client, 250);
    const technicien = texteENR10_(p.technicien, 180);
    const date = texteENR10_(p.date, 40);
    const reference = texteENR10_(p.reference, 180);
    const serie = texteENR10_(p.serie, 250);

    const sujet = 'Fiche de maintenance fauteuil roulant' +
      (reference ? ' – ' + reference : '');

    const corps = [
      'Bonjour,',
      '',
      'Veuillez trouver ci-joint la fiche de maintenance du fauteuil roulant.',
      '',
      'Client : ' + client,
      'Technicien : ' + technicien,
      'Date : ' + date,
      'Référence intervention : ' + reference,
      'N° série / parc : ' + serie,
      'Fichier : ' + nomFichier,
      '',
      'Cordialement,',
      'EuroMed'
    ].join('\n');

    diagnostic.statut = 'ENVOI_EMAIL_EN_COURS';
    enregistrerDiagnosticENR10_(diagnostic);
    etape('Tentative d’envoi à ' + DESTINATAIRE_ENR10);

    // Même service d'envoi que le Code.gs du lit médicalisé qui fonctionne.
    MailApp.sendEmail({
      to: DESTINATAIRE_ENR10,
      subject: sujet,
      body: corps,
      name: NOM_EXPEDITEUR_ENR10,
      attachments: [pdf]
    });

    diagnostic.statut = 'APPEL_MAILAPP_TERMINE';
    etape('MailApp.sendEmail terminé sans exception.');
    enregistrerDiagnosticENR10_(diagnostic);

    return jsonENR10_({
      ok: true,
      message: 'Appel d’envoi du courriel terminé.',
      filename: nomFichier,
      pdfBytes: octets.length
    });

  } catch (err) {
    diagnostic.statut = 'ERREUR';
    diagnostic.erreur = err && err.stack ? String(err.stack) : String(err);
    console.error('[ENR10] ERREUR : ' + diagnostic.erreur);

    try {
      enregistrerDiagnosticENR10_(diagnostic);
    } catch (storageError) {
      console.error('[ENR10] Échec du stockage du diagnostic : ' + String(storageError));
    }

    return jsonENR10_({
      ok: false,
      error: String(err && err.message ? err.message : err)
    });

  } finally {
    console.log('[ENR10] Fin doPost.');
  }
}

function jsonENR10_(objet) {
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}

function texteENR10_(valeur, limite) {
  return String(valeur || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, limite);
}

function sanitizeFilenameENR10_(nom) {
  return String(nom || 'maintenance-fauteuil-roulant.pdf')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120) || 'maintenance-fauteuil-roulant.pdf';
}

/**
 * À lancer manuellement dans Apps Script pour afficher le dernier diagnostic.
 * Ne déclenche aucun envoi de courriel.
 */
function afficherDernierDiagnosticENR10() {
  const valeur = PropertiesService.getScriptProperties()
    .getProperty(CLE_DIAGNOSTIC_ENR10);
  console.log(valeur || 'Aucun diagnostic ENR10 enregistré.');
}

/**
 * Test manuel de courriel, sans PDF.
 * À exécuter seulement si un test de réception est souhaité.
 */
function diagnosticMailENR10() {
  MailApp.sendEmail({
    to: DESTINATAIRE_ENR10,
    subject: 'Test diagnostic EuroMed — fauteuil roulant',
    body: 'Test envoyé le ' + new Date().toISOString() +
      '\nQuota restant : ' + MailApp.getRemainingDailyQuota(),
    name: NOM_EXPEDITEUR_ENR10
  });
  console.log('Appel de test MailApp terminé.');
}
