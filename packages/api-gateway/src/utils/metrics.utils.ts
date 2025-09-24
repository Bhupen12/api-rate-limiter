import client from 'prom-client';

client.collectDefaultMetrics({
  register: client.register,
});

function expBuckets(start: number, factor: number, count: number): number[] {
  const b: number[] = [];
  let v = start;
  for (let i = 0; i < count; i++) {
    b.push(Number(v.toFixed(6)));
    v *= factor;
  }
  return b;
}

export const reqResTime = new client.Histogram({
  name: 'express_req_res_time_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: expBuckets(0.01, 1.6, 15), // ~0.01s → 20s
});

export const totalReqCounter = new client.Counter({
  name: 'express_total_req_counter',
  help: 'Total number of requests',
});

export const metricsRegister = client.register;
