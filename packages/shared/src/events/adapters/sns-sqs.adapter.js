// packages/shared/src/events/adapters/sns-sqs.adapter.js
//
// Bus para AWS (fan-out clásico):
//   - Publicar: un único SNS topic con el atributo `type` en cada mensaje.
//   - Consumir: cada servicio tiene SU cola SQS suscrita al topic (con filter
//     policy por `type` si quiere recibir solo lo que le importa).
//   - Reintentos: si el handler falla no se borra el mensaje; vuelve tras el
//     visibility timeout. La DLQ se configura con la redrive policy de la cola.
//
// Variables: EVENTS_SNS_TOPIC_ARN, EVENTS_SQS_QUEUE_URL, AWS_REGION, AWS_ENDPOINT (LocalStack).

const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { logger } = require('../../utils/logger.util');

const WAIT_TIME_SECONDS = 20; // long polling
const MAX_MESSAGES = 10;
const ERROR_BACKOFF_MS = 5000;

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

class SnsSqsAdapter {
  #sns;
  #sqs;
  #topicArn;
  #queueUrl;
  #running = false;
  #onMessage = null;

  /**
   * @param {{ region: string, topicArn: string, queueUrl?: string, endpoint?: string }} options
   */
  constructor({ region, topicArn, queueUrl, endpoint }) {
    if (!topicArn) {
      throw new Error('EVENTS_SNS_TOPIC_ARN es obligatorio con EVENT_BUS_DRIVER=sns-sqs');
    }
    const clientConfig = { region, ...(endpoint && { endpoint }) };
    this.#sns = new SNSClient(clientConfig);
    this.#sqs = new SQSClient(clientConfig);
    this.#topicArn = topicArn;
    this.#queueUrl = queueUrl;
  }

  async publish(envelope) {
    await this.#sns.send(
      new PublishCommand({
        TopicArn: this.#topicArn,
        Message: JSON.stringify(envelope),
        MessageAttributes: {
          type: { DataType: 'String', StringValue: envelope.type },
          source: { DataType: 'String', StringValue: envelope.source }
        }
      })
    );
  }

  // eslint-disable-next-line require-await
  async start(onMessage) {
    if (!this.#queueUrl) {
      throw new Error('EVENTS_SQS_QUEUE_URL es obligatorio para consumir eventos con sns-sqs');
    }
    this.#onMessage = onMessage;
    this.#running = true;
    this.#loop();
    logger.info('Consumiendo eventos desde SQS', { queueUrl: this.#queueUrl });
  }

  // eslint-disable-next-line require-await
  async stop() {
    this.#running = false;
  }

  async #loop() {
    while (this.#running) {
      try {
        const { Messages = [] } = await this.#sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: this.#queueUrl,
            MaxNumberOfMessages: MAX_MESSAGES,
            WaitTimeSeconds: WAIT_TIME_SECONDS
          })
        );
        for (const message of Messages) {
          await this.#handle(message);
        }
      } catch (error) {
        logger.error('Error leyendo la cola SQS', { error: error.message });
        await sleep(ERROR_BACKOFF_MS);
      }
    }
  }

  async #handle(message) {
    try {
      const body = JSON.parse(message.Body);
      // Sin "raw message delivery" SNS envuelve el mensaje en { Type: 'Notification', Message }.
      const envelope = body.Type === 'Notification' ? JSON.parse(body.Message) : body;
      await this.#onMessage(envelope);
      await this.#sqs.send(new DeleteMessageCommand({ QueueUrl: this.#queueUrl, ReceiptHandle: message.ReceiptHandle }));
    } catch (error) {
      // No se borra: SQS lo reentrega tras el visibility timeout (y a la DLQ tras maxReceiveCount).
      logger.error('Falló el procesamiento de un mensaje SQS', { messageId: message.MessageId, error: error.message });
    }
  }
}

module.exports = SnsSqsAdapter;
