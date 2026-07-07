import { createTransport, type Transporter } from "nodemailer";
import type { Config } from "../config.ts";
import { type Logger, log } from "../logger.ts";

export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class SMTPMailer implements Mailer {
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor(config: Config) {
    this.transporter = createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER
        ? {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
          }
        : undefined,
    });
    this.fromEmail = config.FROM_EMAIL;
    this.fromName = config.FROM_NAME;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({
      from: {
        address: this.fromEmail,
        name: this.fromName,
      },
      to,
      subject,
      text: body,
    });
  }
}

export class ConsoleMailer implements Mailer {
  private logger: Logger;

  constructor(logger: Logger = log) {
    this.logger = logger;
  }

  send(to: string, subject: string, body: string): Promise<void> {
    this.logger("info", "Email captured by console mailer", {
      body,
      subject,
      to,
    });

    return Promise.resolve();
  }
}

export type CapturedMail = {
  body: string;
  subject: string;
  to: string;
};

export class CaptureMailer implements Mailer {
  public readonly mails: CapturedMail[] = [];

  send(to: string, subject: string, body: string): Promise<void> {
    this.mails.push({ body, subject, to });

    return Promise.resolve();
  }
}

export function mailerFromConfig(config: Config): Mailer {
  return config.SMTP_HOST ? new SMTPMailer(config) : new ConsoleMailer();
}
