import { Redis } from 'ioredis';
import { logger } from '../utils/logger.utils';
import SecurityPolicyService from './security-policy.service';
import { REDIS_CHANNELS } from '../constants/redis.constants';

export class InvalidationService {
  private subscriber: Redis;

  constructor(private mainRedisClient: Redis) {
    this.subscriber = mainRedisClient.duplicate();
  }

  async initialize(): Promise<void> {
    await this.subscriber.subscribe(REDIS_CHANNELS.invalidation);
    this.subscriber.on('message', this.handleMessage.bind(this));
    logger.info(`Subscribed to ${REDIS_CHANNELS.invalidation}`);
  }

  private async handleMessage(channel: string, message: string): Promise<void> {
    if (channel === REDIS_CHANNELS.invalidation && message === 'reload') {
      const policyService = SecurityPolicyService.getInstance(
        this.mainRedisClient
      );
      await policyService.reloadAll();
      logger.info('Security policy reloaded after invalidation event');
    }
  }
}
