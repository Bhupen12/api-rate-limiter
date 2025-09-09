import { Redis } from 'ioredis';
import ipRangeCheck from 'ip-range-check';
import {
  REDIS_CHANNELS,
  REDIS_GEO_BLOCK_KEY,
} from '../constants/redis.constants';
import { logger } from '../utils/logger.utils';

class SecurityPolicyService {
  private static instance: SecurityPolicyService | null = null;

  private constructor(private redisClient: Redis) {}

  static getInstance(): SecurityPolicyService {
    if (!this.instance) {
      throw new Error(
        'SecurityPolicyService not bootstrapped. Call bootstrap(redis) at startup.'
      );
    }
    return this.instance;
  }

  static async bootstrap(redisClient: Redis): Promise<void> {
    if (!this.instance) this.instance = new SecurityPolicyService(redisClient);
    await this.instance.reloadAll();
    logger.info('securityPolicyService bootstrapped');
  }

  private ipWhitelist: Set<string> = new Set();
  private ipBlacklist: Set<string> = new Set();
  private countryBlocklist: Set<string> = new Set();
  private cidrBlacklist: string[] = [];

  async reloadAll(): Promise<void> {
    const [whitelist, blacklist, cidrs, countries] = await Promise.all([
      this.redisClient.smembers(REDIS_GEO_BLOCK_KEY.ipWhitelist),
      this.redisClient.smembers(REDIS_GEO_BLOCK_KEY.ipBlacklist),
      this.redisClient.smembers(REDIS_GEO_BLOCK_KEY.cidrBlacklist),
      this.redisClient.smembers(REDIS_GEO_BLOCK_KEY.countryBlocklist),
    ]);

    this.ipWhitelist = new Set(whitelist);
    this.ipBlacklist = new Set(blacklist);
    this.cidrBlacklist = cidrs;
    this.countryBlocklist = new Set(countries);

    logger.info(
      `Reloaded security lists: ${this.ipWhitelist.size} whitelisted IPs, ${this.ipBlacklist.size} blacklisted IPs, ${this.cidrBlacklist.length} CIDRs, ${this.countryBlocklist.size} blocked countries.`
    );
  }

  async subscribeReload(channel = REDIS_CHANNELS.invalidation) {
    const sub = this.redisClient.duplicate();
    await sub.connect();
    await sub.subscribe(channel, async () => {
      logger.info('Policy reload requested via pub/sub');
      await this.reloadAll();
    });
  }

  // check
  isIpWhitelisted(ip: string): boolean {
    return this.ipWhitelist.has(ip);
  }

  isIpBlacklisted(ip: string): boolean {
    if (this.ipBlacklist.has(ip)) return true;
    return ipRangeCheck(ip, this.cidrBlacklist);
  }

  isCountryBlocked(countryCode: string): boolean {
    return this.countryBlocklist.has(countryCode.toUpperCase());
  }

  // Mutators (keep Redis source of truth, then refresh memory)
  async addWhitelist(ip: string) {
    await this.redisClient.sadd(REDIS_GEO_BLOCK_KEY.ipWhitelist, ip);
    this.ipWhitelist.add(ip);
  }
  async removeWhitelist(ip: string) {
    await this.redisClient.srem(REDIS_GEO_BLOCK_KEY.ipWhitelist, ip);
    this.ipWhitelist.delete(ip);
  }
  async addBlacklist(ip: string) {
    await this.redisClient.sadd(REDIS_GEO_BLOCK_KEY.ipBlacklist, ip);
    this.ipBlacklist.add(ip);
  }
  async removeBlacklist(ip: string) {
    await this.redisClient.srem(REDIS_GEO_BLOCK_KEY.ipBlacklist, ip);
    this.ipBlacklist.delete(ip);
  }
  async addCidr(cidr: string) {
    await this.redisClient.sadd(REDIS_GEO_BLOCK_KEY.cidrBlacklist, cidr);
    this.cidrBlacklist.push(cidr);
  }
  async removeCidr(cidr: string) {
    await this.redisClient.srem(REDIS_GEO_BLOCK_KEY.cidrBlacklist, cidr);
    this.cidrBlacklist = this.cidrBlacklist.filter((c) => c !== cidr);
  }
  async addCountry(code: string) {
    const up = code.toUpperCase();
    await this.redisClient.sadd(REDIS_GEO_BLOCK_KEY.countryBlocklist, up);
    this.countryBlocklist.add(up);
  }
  async removeCountry(code: string) {
    const up = code.toUpperCase();
    await this.redisClient.srem(REDIS_GEO_BLOCK_KEY.countryBlocklist, up);
    this.countryBlocklist.delete(up);
  }
}

export default SecurityPolicyService;
