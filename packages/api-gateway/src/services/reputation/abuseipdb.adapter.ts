import axios from 'axios';
import { config } from '../../config';
import { ReputationAdapter, ReputationResult } from '../../types/ip-reputation';

export class AbuseIPDBAdapter implements ReputationAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxAgeInDays: number;

  constructor() {
    this.baseUrl = config.abuseipdb.baseUrl;
    this.apiKey = config.abuseipdb.apiKey;
    this.maxAgeInDays = config.abuseipdb.maxAgeInDays;
  }

  async check(ip: string): Promise<ReputationResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/check`, {
        params: {
          ipAddress: ip,
          maxAgeInDays: this.maxAgeInDays,
          verbose: true,
        },
        headers: {
          Key: this.apiKey,
          Accept: 'application/json',
        },
      });
      const data = response.data;

      return {
        score: data.abuseConfidenceScore,
        lastSeen: data.lastReportedAt,
        isProxy: data.usageType?.includes('Data Center'),
        isTor: data.isTor,
        isVpn: data.usageType?.toLowerCase().includes('vpn') || false,
        categories: data.reports?.flatMap((r: any) => r.categories) || [],
      };
    } catch (error) {
      console.error('IPQualityScore API error:', error);
      return {};
    }
  }
}
