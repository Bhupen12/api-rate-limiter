import { ReputationAdapter, ReputationResult } from '../../types/ip-reputation';

export class ReputationService {
  constructor(private adapters: ReputationAdapter[]) {}

  async check(ip: string): Promise<ReputationResult[]> {
    return Promise.all(this.adapters.map((adapter) => adapter.check(ip)));
  }
}
