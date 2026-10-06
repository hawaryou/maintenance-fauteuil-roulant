/**
 * ENR10 — Maintenance fauteuil roulant
 * Apps Script indépendant de l'ENR08 (lit médicalisé).
 *
 * Déployer comme Application Web :
 * - Exécuter en tant que : Moi
 * - Accès : Toute personne disposant du lien
 */
const DESTINATAIRE = 'valentineuromed@gmail.com';
const NOM_EXPEDITEUR = 'EuroMed - Fiches de maintenance fauteuil roulant';

function doGet() {
  return ContentService
    .createTextOutput('ENR10 fauteuil roulant : service actif')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!e || !e.parameter) throw new Error('Aucune donnée reçue.');

    const token = PropertiesService.getScriptProperties().getProperty('APP_TOKEN');
    if (token && e.parameter.token !== token) {
      throw new Error('Token invalide.');
    }

    const base64 = e.parameter.pdf_base64 || '';
    if (!base64) throw new Error('PDF manquant.');

    const filename = sanitizeFilename_(e.parameter.filename || 'ENR10-fauteuil-roulant.pdf');
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, 'application/pdf', filename);

    const client = String(e.parameter.client || '').trim();
    const technicien = String(e.parameter.technicien || '').trim();
    const date = String(e.parameter.date || '').trim();
    const reference = String(e.parameter.reference || '').trim();
    const serie = String(e.parameter.serie || '').trim();

    // Plusieurs fauteuils : aucun nom dans l'objet.
    // Un seul fauteuil : le nom du client est ajouté à l'objet.
    const clients = client.split(/\s*;\s*|\s*\|\s*|\n+/)
      .map(s => s.trim()).filter(Boolean);
    const multiple = clients.length > 1 || /^\d+\s+fauteuils?$/i.test(serie);
    const nomObjet = (!multiple && clients[0]) ? ` – ${clients[0]}` : '';
    const sujet = `Fiche de maintenance fauteuil roulant – ENR10${nomObjet}`;

    const corps = [
      'Bonjour,',
      '',
      'Veuillez trouver ci-joint la fiche de maintenance de fauteuil roulant ENR10.',
      '',
      `Client : ${client}`,
      `Technicien : ${technicien}`,
      `Date : ${date}`,
      `Référence intervention : ${reference}`,
      `N° série / parc : ${serie}`,
      '',
      'Le PDF a été généré automatiquement depuis la fiche en ligne.',
      '',
      'Cordialement,',
      'EuroMed'
    ].join('\n');

    MailApp.sendEmail({
      to: DESTINATAIRE,
      subject: sujet,
      body: corps,
      name: NOM_EXPEDITEUR,
      attachments: [blob]
    });

    return json_({ok: true, message: 'Fiche ENR10 envoyée.'});
  } catch (err) {
    console.error(err);
    return json_({ok: false, error: String(err)});
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeFilename_(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120) || 'ENR10-fauteuil-roulant.pdf';
}
