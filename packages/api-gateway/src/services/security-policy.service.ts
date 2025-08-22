import { Redis } from 'ioredis';
import ipRangeCheck from 'ip-range-check';
import { logger } from '../utils/logger.utils';
import { REDIS_GEO_BLOCK_KEY } from '../constants/redis.constants';

class SecurityPolicyService {
  private ipWhitelist: Set<string> = new Set();
  private ipBlacklist: Set<string> = new Set();
  private countryBlocklist: Set<string> = new Set();
  private cidrBlacklist: string[] = []; // ip-range-check works with an array

  private static instance: SecurityPolicyService;
  private redisClient: Redis;

  private constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  public static getInstance(redisClient: Redis): SecurityPolicyService {
    if (!SecurityPolicyService.instance) {
      SecurityPolicyService.instance = new SecurityPolicyService(redisClient);
    }
    return SecurityPolicyService.instance;
  }

  /**
   * Initializes the service by loading all lists from Redis into memory.
   * This should be called on application startup.
   */
  async initialize(): Promise<void> {
    logger.info(
      'Initializing SecurityPolicyService: loading lists from Redis...'
    );
    await this.reloadAll();
    logger.info('SecurityPolicyService initialized successfully.');
  }

  /**
   * Reloads all lists from Redis. Can be triggered by a pub/sub event.
   */
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

  isIpWhitelisted(ip: string): boolean {
    return this.ipWhitelist.has(ip);
  }

  isIpBlacklisted(ip: string): boolean {
    if (this.ipBlacklist.has(ip)) return true;
    // Check CIDR ranges
    return ipRangeCheck(ip, this.cidrBlacklist);
  }

  isCountryBlocked(countryCode: string): boolean {
    return this.countryBlocklist.has(countryCode.toUpperCase());
  }
}

export default SecurityPolicyService;
