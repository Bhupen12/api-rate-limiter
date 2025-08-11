import ipaddr from 'ipaddr.js';
import { Request } from 'express';
import { CLOUDFLARE_IP_RANGES } from '../constants/cloudflare-ips';
import { logger } from './logger.utils';

function isPrivate(ip: string) {
  try {
    const addr = ipaddr.parse(ip); // Parse IP for IPv4/IPv6
    const range = addr.range(); // Get range type
    return [
      'private',
      'loopback',
      'linkLocal',
      'uniqueLocal',
      'reserved',
    ].includes(range);
  } catch {
    return false; // Invalid IP means it's not trusted
  }
}

function isFromCloudflare(ip: string): boolean {
  try {
    const parsedIp = ipaddr.parse(ip);

    return CLOUDFLARE_IP_RANGES.some((range) => {
      const [rangeAddr, prefix] = range.split('/');
      const parsedRange = ipaddr.parse(rangeAddr);
      return parsedIp.match(parsedRange, parseInt(prefix, 10));
    });
  } catch (error) {
    logger.error('Ip from cloudflare check fails:', error);
    return false;
  }
}

export function getClientIp(req: Request): string | null {
  const remote = req.socket.remoteAddress?.replace(/^::ffff:/, '') || null;

  // 1. Trust CF header only if request from CF IP
  if (remote && isFromCloudflare(remote)) {
    const cf = req.headers['cf-connecting-ip'] as string;
    if (cf && !isPrivate(cf)) return cf;
  }

  // 2. Check X-Real-IP
  const xr = req.headers['x-real-ip'] as string | undefined;
  if (xr && !isPrivate(xr)) return xr;

  // 3. Check X-Forwarded-For
  const xff = req.headers['x-forwarded-for'] as string | string[] | undefined;
  if (xff) {
    const list = (Array.isArray(xff) ? xff : xff.split(',')).map((s) =>
      s.trim()
    );
    for (const ip of list) {
      if (!isPrivate(ip)) return ip;
    }
    return list[0]; // fallback if all are private
  }

  // 4. Fallback
  return remote;
}
