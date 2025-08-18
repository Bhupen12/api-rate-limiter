import { eq, isNull } from 'drizzle-orm';
import { db } from 'src/db';
import { blockedCidrs } from '../db/schema/blocked_cidrs';
import { logger } from '../utils/logger.utils';
import Redis from 'ioredis';
import ipRangeCheck from 'ip-range-check';

const CIDR_CACHE_KEY = 'ip:cidrs:blocked';
const CIDR_CACHE_TTL = 3600; // 1hr

export class IpBlockService {
  private memoryBlockedCidrCache: string[] = [];

  async initialize(client: Redis) {
    await this.reloadCidrCache(client);
  }

  async reloadCidrCache(client: Redis) {
    try {
      const cidrs = await db
        .select()
        .from(blockedCidrs)
        .where(isNull(blockedCidrs.expiresAt))
        .execute();

      this.memoryBlockedCidrCache = cidrs.map((c) => c.cidr);

      await client.del(CIDR_CACHE_KEY);

      if (this.memoryBlockedCidrCache.length > 0) {
        await client.sadd(CIDR_CACHE_KEY, ...this.memoryBlockedCidrCache);
        await client.expire(CIDR_CACHE_KEY, CIDR_CACHE_TTL);
      }
    } catch (error) {
      logger.error('Error Reloading CIDR cache:', error);
    }
  }

  isIpBlocked(ip: string): boolean {
    return ipRangeCheck(ip, this.memoryBlockedCidrCache);
  }

  async addBlockedCidr(client: Redis, cidr: string, reason: string) {
    await db.insert(blockedCidrs).values({
      cidr,
      reason,
      createdBy: 'system',
      createdAt: new Date(),
    });

    await this.reloadCidrCache(client);
  }

  async removeBlockedCidr(client: Redis, cidr: string) {
    await db.delete(blockedCidrs).where(eq(blockedCidrs.cidr, cidr));

    await this.reloadCidrCache(client);
  }
}

export const ipBlockService = new IpBlockService();
