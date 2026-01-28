import nodemailer from 'nodemailer';

// Configure transporter (uses environment variables)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER) {
      console.log('[Email] SMTP not configured, skipping email:', options.subject);
      return false;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });

    console.log('[Email] Sent to:', options.to);
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}

// Email templates
export const emailTemplates = {
  quoteCreated: (data: { prospectName: string; quoteNumber: string; amount: number }) => ({
    subject: `Nouveau devis ${data.quoteNumber} - Solution GS`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Solution GS</h1>
        <h2>Nouveau devis créé</h2>
        <p>Bonjour ${data.prospectName},</p>
        <p>Nous avons le plaisir de vous informer qu'un nouveau devis a été créé pour vous :</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Numéro de devis :</strong> ${data.quoteNumber}</p>
          <p><strong>Montant TTC :</strong> ${data.amount.toLocaleString('fr-FR')} €</p>
        </div>
        <p>N'hésitez pas à nous contacter pour toute question.</p>
        <p>Cordialement,<br/>L'équipe Solution GS</p>
      </div>
    `,
  }),

  quoteSigned: (data: { prospectName: string; quoteNumber: string; depositAmount: number }) => ({
    subject: `Devis ${data.quoteNumber} signé - Solution GS`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Solution GS</h1>
        <h2>Devis signé avec succès</h2>
        <p>Bonjour ${data.prospectName},</p>
        <p>Nous vous confirmons la signature de votre devis :</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Numéro de devis :</strong> ${data.quoteNumber}</p>
          <p><strong>Acompte à régler :</strong> ${data.depositAmount.toLocaleString('fr-FR')} €</p>
        </div>
        <p>Notre équipe vous contactera prochainement pour planifier l'installation.</p>
        <p>Cordialement,<br/>L'équipe Solution GS</p>
      </div>
    `,
  }),

  appointmentReminder: (data: { prospectName: string; date: string; time: string; commercialName: string }) => ({
    subject: `Rappel RDV - ${data.date} à ${data.time}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Solution GS</h1>
        <h2>Rappel de rendez-vous</h2>
        <p>Bonjour ${data.prospectName},</p>
        <p>Nous vous rappelons votre rendez-vous prévu :</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date :</strong> ${data.date}</p>
          <p><strong>Heure :</strong> ${data.time}</p>
          <p><strong>Commercial :</strong> ${data.commercialName}</p>
        </div>
        <p>En cas d'empêchement, merci de nous prévenir au plus tôt.</p>
        <p>Cordialement,<br/>L'équipe Solution GS</p>
      </div>
    `,
  }),

  paymentReceived: (data: { prospectName: string; amount: number; quoteNumber: string }) => ({
    subject: `Paiement reçu - ${data.quoteNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Solution GS</h1>
        <h2>Paiement reçu</h2>
        <p>Bonjour ${data.prospectName},</p>
        <p>Nous confirmons la réception de votre paiement :</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Montant :</strong> ${data.amount.toLocaleString('fr-FR')} €</p>
          <p><strong>Devis :</strong> ${data.quoteNumber}</p>
        </div>
        <p>Cordialement,<br/>L'équipe Solution GS</p>
      </div>
    `,
  }),

  passwordReset: (data: { userName: string; resetLink: string }) => ({
    subject: 'Réinitialisation de mot de passe - Solution GS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Solution GS</h1>
        <h2>Réinitialisation de mot de passe</h2>
        <p>Bonjour ${data.userName},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Ce lien expire dans 1 heure.</p>
        <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <p>Cordialement,<br/>L'équipe Solution GS</p>
      </div>
    `,
  }),

  alertNotification: (data: { userName: string; alertTitle: string; alertMessage: string; dueDate: string }) => ({
    subject: `Alerte : ${data.alertTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Solution GS</h1>
        <h2>Nouvelle alerte</h2>
        <p>Bonjour ${data.userName},</p>
        <p>Une nouvelle alerte vous a été assignée :</p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
          <p><strong>${data.alertTitle}</strong></p>
          <p>${data.alertMessage}</p>
          <p><strong>À traiter avant le :</strong> ${data.dueDate}</p>
        </div>
        <p>Connectez-vous au CRM pour traiter cette alerte.</p>
        <p>Cordialement,<br/>L'équipe Solution GS</p>
      </div>
    `,
  }),
};

export default { sendEmail, emailTemplates };
