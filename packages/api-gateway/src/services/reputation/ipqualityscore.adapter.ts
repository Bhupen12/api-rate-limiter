import axios from 'axios';
import { config } from '../../config';
import { ReputationAdapter, ReputationResult } from '../../types/ip-reputation';

export class IPQualityScoreAdapter implements ReputationAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.reputation.ipqualityscore.baseUrl;
    this.apiKey = config.reputation.ipqualityscore.apiKey;
  }

  async check(ip: string): Promise<ReputationResult> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/${this.apiKey}/${ip}`, {
        params: { strictness: 1, fast: true, allow_public_access_points: true },
      });

      return {
        score: Number(data.fraud_score) || undefined,
        lastSeen: data.recent_abuse ? new Date().toISOString() : undefined,
        isProxy: !!data.proxy,
        isTor: !!data.tor || !!data.active_tor,
        isVpn: !!data.vpn || !!data.active_vpn,
        categories: [
          ...(data.recent_abuse ? ['abuse'] : []),
          ...(data.bot_status || data.is_crawler ? ['bot'] : []),
          ...(data.proxy ? ['proxy'] : []),
          ...(data.vpn || data.active_vpn ? ['vpn'] : []),
          ...(data.tor || data.active_tor ? ['tor'] : []),
        ],
      } as ReputationResult;
    } catch (error) {
      console.error('IPQualityScore API error:', error);
      return {};
    }
  }
}
