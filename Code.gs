/**
 * ENR10-V03 — Réception et envoi des fiches PDF fauteuil roulant manuel.
 * Dans Apps Script : déployer ce projet comme application Web, exécuter en tant que propriétaire.
 */
const DESTINATAIRE_ENR10 = 'valentineuromed@gmail.com';
const NOM_EXPEDITEUR_ENR10 = 'EuroMed - Maintenance fauteuil roulant';

function doGet() {
  return ContentService.createTextOutput('ENR10-V03 : service actif')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const tokenAttendu = PropertiesService.getScriptProperties().getProperty('APP_TOKEN');
    if (tokenAttendu && p.token !== tokenAttendu) throw new Error('Token invalide.');
    const base64 = String(p.pdf_base64 || '');
    if (!base64) throw new Error('PDF manquant.');
    if (base64.length > 11000000) throw new Error('PDF trop volumineux pour cet envoi.');
    const nom = nomFichierENR10_(p.filename || 'ENR10-V03.pdf');
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', nom);
    const reference = texteENR10_(p.reference, 180);
    const sujet = 'Maintenance fauteuil roulant manuel — ENR10-V03' + (reference ? ' — ' + reference : '');
    const corps = [
      'Bonjour,', '',
      'Veuillez trouver ci-joint la fiche de maintenance fauteuil roulant manuel ENR10-V03.',
      '', 'Client / établissement : ' + texteENR10_(p.client, 250),
      'Technicien : ' + texteENR10_(p.technicien, 180),
      'Date : ' + texteENR10_(p.date, 40),
      'Référence intervention : ' + reference,
      'N° série / parc : ' + texteENR10_(p.serie, 250),
      '', 'Message généré automatiquement par EuroMed.', '', 'Cordialement,', 'EuroMed'
    ].join('\n');
    MailApp.sendEmail({to: DESTINATAIRE_ENR10, subject: sujet, body: corps, name: NOM_EXPEDITEUR_ENR10, attachments: [blob]});
    return jsonENR10_({ok:true, message:'Fiche fauteuil roulant envoyée.'});
  } catch (err) {
    console.error(err);
    return jsonENR10_({ok:false, error:String(err && err.message ? err.message : err)});
  }
}

function jsonENR10_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function texteENR10_(v, max) {
  return String(v || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
}
function nomFichierENR10_(v) {
  return String(v || 'ENR10-V03.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'ENR10-V03.pdf';
}
