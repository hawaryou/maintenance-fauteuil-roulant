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
    euromedAuthorizeMail_(e);
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

    euromedLogMailEvent_(e, EUROMED_APP_KEY, 'accepted');
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
    euromedLogMailEvent_(e, EUROMED_APP_KEY, 'failed', storageError && storageError.name ? storageError.name : 'error');
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

/**
 * EuroMed — vérification serveur avant tout envoi d'e-mail.
 * À copier dans CHAQUE projet Google Apps Script qui appelle MailApp/GmailApp.
 * Ne jamais journaliser ni enregistrer le jeton reçu.
 */
const EUROMED_AUTH_URL = 'https://nrtrraawiqfbajccfmzc.supabase.co';
const EUROMED_AUTH_PUBLIC_KEY = 'sb_publishable_mI8nBWjKRxTgn2b8ppAyoA_BaxQI4zx';
// À personnaliser différemment dans chaque projet Apps Script.
const EUROMED_APP_KEY = 'maintenance-fauteuil';

function euromedAuthorizeMail_(event) {
  const params = {};
  if (event && event.parameter) {
    Object.keys(event.parameter).forEach(function (key) {
      params[key] = event.parameter[key];
    });
  }

  const raw = event && event.postData && event.postData.contents
    ? String(event.postData.contents) : '';
  if (raw) {
    try {
      const object = JSON.parse(raw);
      if (object && typeof object === 'object' && !Array.isArray(object)) {
        Object.keys(object).forEach(function (key) { params[key] = object[key]; });
      }
    } catch (ignore) {
      raw.split('&').forEach(function (part) {
        const index = part.indexOf('=');
        if (index < 0) return;
        const key = decodeURIComponent(part.slice(0, index).replace(/\+/g, ' '));
        const value = decodeURIComponent(part.slice(index + 1).replace(/\+/g, ' '));
        if (!(key in params)) params[key] = value;
      });
    }
  }

  const accessToken = String(params.euromed_access_token || '').trim();
  if (!accessToken) throw new Error('Connexion EuroMed requise pour envoyer un e-mail.');

  const headers = {
    apikey: EUROMED_AUTH_PUBLIC_KEY,
    Authorization: 'Bearer ' + accessToken
  };
  const userResponse = UrlFetchApp.fetch(EUROMED_AUTH_URL + '/auth/v1/user', {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (userResponse.getResponseCode() !== 200) {
    throw new Error('Session EuroMed invalide ou expirée. Reconnectez-vous.');
  }
  const user = JSON.parse(userResponse.getContentText() || '{}');
  if (!user.id || !user.email) throw new Error('Compte EuroMed introuvable.');

  const profileUrl = EUROMED_AUTH_URL + '/rest/v1/euromed_profiles' +
    '?select=approved,role,active,session_revoked_at&id=eq.' + encodeURIComponent(user.id);
  const profileResponse = UrlFetchApp.fetch(profileUrl, {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (profileResponse.getResponseCode() !== 200) {
    throw new Error('Impossible de vérifier l’autorisation EuroMed.');
  }
  const profiles = JSON.parse(profileResponse.getContentText() || '[]');
  if (!profiles.length || profiles[0].approved !== true || profiles[0].active !== true) {
    euromedLogMailEvent_(event, EUROMED_APP_KEY, 'blocked', profiles.length && profiles[0].active === false ? 'account-suspended' : 'account-not-approved');
    throw new Error('Compte EuroMed en attente de validation : envoi refusé.');
  }
  const issuedAt = euromedTokenIssuedAt_(accessToken);
  const revokedAt = profiles[0].session_revoked_at ? Math.floor(new Date(profiles[0].session_revoked_at).getTime() / 1000) : 0;
  if (!issuedAt || (revokedAt && issuedAt <= revokedAt)) {
    euromedLogMailEvent_(event, EUROMED_APP_KEY, 'blocked', 'session-revoked');
    throw new Error('Session révoquée. Reconnectez-vous avec votre nouveau lien d’accès.');
  }

  const policyResponse = UrlFetchApp.fetch(EUROMED_AUTH_URL + '/rest/v1/rpc/euromed_get_mail_policy', {
    method: 'post', headers: headers, contentType: 'application/json', payload: '{}', muteHttpExceptions: true
  });
  if (policyResponse.getResponseCode() !== 200 || policyResponse.getContentText() !== 'true') {
    euromedLogMailEvent_(event, EUROMED_APP_KEY, 'blocked', 'mail-paused');
    throw new Error('Les envois e-mail sont temporairement suspendus par l’administrateur EuroMed.');
  }
  return { id: user.id, email: user.email, role: profiles[0].role };
}

function euromedTokenIssuedAt_(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return 0;
    const decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(part)).getDataAsString();
    return Number(JSON.parse(decoded).iat || 0);
  } catch (ignore) { return 0; }
}

/**
 * Ajoute un événement minimal au suivi administrateur (sans destinataire ni contenu).
 * Appeler après l'envoi MailApp réussi, puis dans catch en cas d'échec.
 */
function euromedLogMailEvent_(event, appKey, status, errorCode) {
  try {
    const params = {};
    if (event && event.parameter) Object.keys(event.parameter).forEach(function (key) { params[key] = event.parameter[key]; });
    const raw = event && event.postData && event.postData.contents ? String(event.postData.contents) : '';
    if (raw) {
      try { Object.assign(params, JSON.parse(raw)); } catch (ignore) {
        raw.split('&').forEach(function (part) {
          const i = part.indexOf('='); if (i < 0) return;
          params[decodeURIComponent(part.slice(0, i).replace(/\+/g, ' '))] = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
        });
      }
    }
    const token = String(params.euromed_access_token || '').trim();
    if (!token) return;
    UrlFetchApp.fetch(EUROMED_AUTH_URL + '/rest/v1/rpc/euromed_log_mail_event', {
      method: 'post',
      headers: { apikey: EUROMED_AUTH_PUBLIC_KEY, Authorization: 'Bearer ' + token },
      contentType: 'application/json',
      payload: JSON.stringify({ p_app_key: String(appKey || 'inconnu').slice(0, 80), p_status: status, p_error_code: status === 'failed' ? String(errorCode || 'erreur').slice(0, 80) : null }),
      muteHttpExceptions: true
    });
  } catch (ignore) { /* Les journaux ne doivent jamais empêcher un envoi ou son traitement. */ }
}

