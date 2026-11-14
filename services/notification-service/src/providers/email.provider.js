// services/notification-service/src/providers/email.provider.js
//
// Proveedor de email intercambiable por configuración (EMAIL_PROVIDER):
//   console → no envía, solo loggea (dev / test)
//   ses     → Amazon SES
// Para otro proveedor (SendGrid, Resend…) agregar una clase con send() y un case.

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { logger } = require('@plantilla/shared/utils/logger.util');
const config = require('#config/index');

class ConsoleEmailProvider {
  // eslint-disable-next-line class-methods-use-this, require-await
  async send({ to, subject }) {
    logger.info('📧 [console] Email simulado', { subject, toDomain: String(to).split('@')[1] });
    return { messageId: `console-${Date.now()}` };
  }
}

class SesEmailProvider {
  #client = new SESClient({ region: config.email.sesRegion });

  async send({ to, subject, text, html }) {
    const result = await this.#client.send(
      new SendEmailCommand({
        Source: config.email.from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' }, ...(html && { Html: { Data: html, Charset: 'UTF-8' } }) }
        }
      })
    );
    return { messageId: result.MessageId };
  }
}

const createEmailProvider = () => (config.email.provider === 'ses' ? new SesEmailProvider() : new ConsoleEmailProvider());

module.exports = createEmailProvider();
