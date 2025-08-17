import 'dotenv/config';
import {Channel, ChannelModel, getChannel } from 'rabbit-mq-conn';

const QUEUE_NAME = process.env.RABBIT_MQ_NAME!;
let inFlight = 0;
let channel: Channel | null = null;
let channelModel: ChannelModel | null = null;

async function initRabbitMQ() {
  const { channel: chnl, channelModel: mdl } = await getChannel();

  channel = chnl;
  channelModel = mdl;

  channel.prefetch(3);

  console.log(`✅ Connected to RabbitMQ. Waiting for messages in ...`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    inFlight++;
    const content = msg.content.toString();
    console.log(`📩 Received: ${content}`);

    try {
      await handleMessage(content);
      chnl.ack(msg);
    } catch (err) {
      console.error('❌ Error processing message:', err);
      chnl.nack(msg, false, true);
    } finally {
      inFlight--;
    }
  });
}

async function monitorQueue() {
  setInterval(async () => {
    if (inFlight === 0 && channel) {
      const q = await channel.checkQueue(QUEUE_NAME);
      if (q.messageCount === 0) {
        console.log('⏳ Queue is empty...');
      }
    }
  }, 2000);
}

async function handleMessage(content: string) {
  const delay = Math.floor(Math.random() * 2000) + 500;
  return new Promise<void>((resolve) => setTimeout(() => {
    console.log(`✅ Processed: ${content}`);
    resolve();
  }, delay));
}

async function shutdown() {
  console.log('🛑 Shutting down...');
  try {
    if (channel && channelModel) {
      await channel.close();
      await channelModel.close();
      console.log('✅ RabbitMQ channel & connection closed');
    }
    console.log('✅ MySQL pool closed');
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);


(async () => {
  try {
    await initRabbitMQ();
    await monitorQueue();
  } catch (err) {
    console.error('❌ Failed to start consumer:', err);
    process.exit(1);
  }
})();
