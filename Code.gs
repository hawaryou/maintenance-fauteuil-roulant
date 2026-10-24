/**
 * ENR10-V04 — Réception et envoi des fiches PDF fauteuil roulant manuel.
 * Fonctionnement aligné sur le Code.gs ENR08 de la maintenance lit médicalisé.
 * Déployer comme application Web, exécutée en tant que propriétaire.
 */
const DESTINATAIRE_ENR10 = 'valentineuromed@gmail.com';
const NOM_EXPEDITEUR_ENR10 = 'EuroMed - Maintenance fauteuil roulant';

function doGet() {
  return ContentService
    .createTextOutput('ENR10-V04 : service actif')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!e || !e.parameter) throw new Error('Aucune donnée reçue.');

    const token = PropertiesService.getScriptProperties().getProperty('APP_TOKEN');
    if (token && e.parameter.token !== token) {
      return jsonENR10_({ok:false, error:'Token invalide'});
    }

    const filename = nomFichierENR10_(e.parameter.filename || 'ENR10-V04.pdf');
    const base64 = e.parameter.pdf_base64 || '';
    if (!base64) throw new Error('PDF manquant.');

    const bytes = Utilities.base64Decode(base64);
    if (
      bytes.length < 5 ||
      bytes[0] !== 37 ||
      bytes[1] !== 80 ||
      bytes[2] !== 68 ||
      bytes[3] !== 70 ||
      bytes[4] !== 45
    ) {
      throw new Error('Le contenu reçu n’est pas un PDF valide.');
    }

    const blob = Utilities.newBlob(bytes, 'application/pdf', filename);

    const client = texteENR10_(e.parameter.client, 250);
    const technicien = texteENR10_(e.parameter.technicien, 180);
    const date = texteENR10_(e.parameter.date, 40);
    const reference = texteENR10_(e.parameter.reference, 180);
    const serie = texteENR10_(e.parameter.serie, 250);

    const sujet = 'Fiche de maintenance fauteuil roulant manuel – ENR10-V04' +
      (reference ? ' – ' + reference : '');

    const corps = [
      'Bonjour,',
      '',
      'Veuillez trouver ci-joint la fiche de maintenance fauteuil roulant manuel ENR10.',
      '',
      'Client : ' + client,
      'Technicien : ' + technicien,
      'Date : ' + date,
      'Référence intervention : ' + reference,
      'N° série / parc : ' + serie,
      '',
      'Le PDF a été généré automatiquement depuis la fiche EuroMed.',
      '',
      'Cordialement,',
      'EuroMed'
    ].join('\n');

    MailApp.sendEmail({
      to: DESTINATAIRE_ENR10,
      subject: sujet,
      body: corps,
      name: NOM_EXPEDITEUR_ENR10,
      attachments: [blob]
    });

    console.log('ENR10 : MailApp.sendEmail terminé sans erreur. Fichier : ' + filename);

    return jsonENR10_({ok:true, message:'Fiche fauteuil roulant transmise à MailApp.'});
  } catch (err) {
    const message = String(err && err.message ? err.message : err);
    console.error('ENR10 — ÉCHEC : ' + message);
    return jsonENR10_({ok:false, error:message});
  }
}

function jsonENR10_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function texteENR10_(v, max) {
  return String(v || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);
}

function nomFichierENR10_(v) {
  return String(v || 'ENR10-V04.pdf')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120) || 'ENR10-V04.pdf';
}

/**
 * Diagnostic manuel : affiche les informations de quotas et de service.
 * N'envoie aucun courriel.
 */
function diagnosticENR10() {
  const diagnostic = {
    date: new Date().toISOString(),
    destinataire: DESTINATAIRE_ENR10,
    quotaRestant: MailApp.getRemainingDailyQuota(),
    service: 'ENR10-V04'
  };
  console.log(JSON.stringify(diagnostic));
  return diagnostic;
}
