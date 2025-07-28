import nodemailer from 'nodemailer';
import { envs } from './envs';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAdapter {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

export class GmailAdapter implements EmailAdapter {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: envs.MAILER_SERVICE, // 'gmail'
      auth: {
        user: envs.MAILER_EMAIL,    // foroapp1@gmail.com
        pass: envs.MAILER_SECRET_KEY // dkmimwxpztgwvvoz
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: `"Foro Platform" <${envs.MAILER_EMAIL}>`, // foroapp1@gmail.com
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log('📧 Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  // Método para verificar conexión (útil para testing)
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Gmail connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Gmail connection failed:', error);
      return false;
    }
  }
}

// Para testing - Mock adapter
export class MockEmailAdapter implements EmailAdapter {
  private sentEmails: EmailOptions[] = [];

  async sendEmail(options: EmailOptions): Promise<boolean> {
    console.log('📧 Mock Email Sent:', {
      to: options.to,
      subject: options.subject,
      bodyLength: options.html.length
    });
    this.sentEmails.push(options);
    return true;
  }

  getSentEmails(): EmailOptions[] {
    return this.sentEmails;
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}

// Factory para crear el adapter apropiado
export const createEmailAdapter = (): EmailAdapter => {
  if (envs.NODE_ENV === 'test') {
    return new MockEmailAdapter();
  }
  return new GmailAdapter();
};