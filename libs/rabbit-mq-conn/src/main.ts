import { Channel, ChannelModel, connect } from 'amqplib';

async function getChannel() {
  try {
    const channelModel = await connect(process.env.RABBIT_MQ_CONN_URL!);
    const channel = await channelModel.createChannel();
    const queueName = process.env.RABBIT_MQ_NAME!;
    await channel.assertQueue(queueName, { durable: true });
    console.log(`✅ RabbitMQ connected. Queue: ${queueName}`);
    return {
      channel,
      channelModel,
    }
  } catch (err) {
    console.error('❌ Error connecting to RabbitMQ:', err);
    process.exit(1);
  }

}

export {
  Channel,
  ChannelModel,
  getChannel,
}