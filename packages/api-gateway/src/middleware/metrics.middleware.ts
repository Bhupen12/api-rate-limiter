import { Request, Response, RequestHandler } from 'express';
import responseTime from 'response-time';
import { reqResTime, totalReqCounter } from '../utils/metrics.utils';

export const metricsMiddleware: RequestHandler = responseTime(
  (req: Request, res: Response, time: number) => {
    // increment total requests
    totalReqCounter.inc();

    // record latency in seconds
    reqResTime
      .labels(req.method, req.originalUrl, String(res.statusCode))
      .observe(time / 1000);
  }
);
