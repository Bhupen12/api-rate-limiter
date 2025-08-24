export interface ReputationResult {
  score?: number;
  categories?: string[];
  lastSeen?: string;
  isProxy?: boolean;
  isTor?: boolean;
  isVpn?: boolean;
}

export interface ReputationAdapter {
  check(ip: string): Promise<ReputationResult>;
}
