import { GEO_BLOCK_ERRORS } from 'src/constants/api-response';
import { IpBlockService } from 'src/services/ip-block.service';
import { failure, success } from 'src/utils/response.utils';
import { Request, Response } from 'express';

export class CIDRController {
  constructor(private readonly ipBlockService: IpBlockService) {}

  async addBlockedCidr(req: Request, res: Response) {
    const { cidr, reason } = req.body;
    const redisClient = req.redis;
    if (!cidr || !reason) {
      return failure(res, 400, GEO_BLOCK_ERRORS.INVALID_IP);
    }

    await this.ipBlockService.addBlockedCidr(redisClient, cidr, reason);
    return success(res, cidr, 'CIDR block added successfully');
  }

  async removeBlockedCidr(req: Request, res: Response) {
    const { cidr } = req.body;
    const redisClient = req.redis;
    if (!cidr) {
      return failure(res, 400, GEO_BLOCK_ERRORS.INVALID_IP);
    }

    await this.ipBlockService.removeBlockedCidr(redisClient, cidr);
    return success(res, cidr, 'CIDR block removed successfully');
  }
}
