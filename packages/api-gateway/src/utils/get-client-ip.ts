import ipaddr from 'ipaddr.js';
import { Request } from 'express';

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

export function getClientIp(req: Request): string | null {
  // 1. Check Cloudflare header
  const cf = (req.headers['cf-connecting-ip'] as string) || undefined;
  if (cf) return cf;

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

  // 4. Fallback to socket address
  const remote = req.socket.remoteAddress;
  if (!remote) return null;
  return remote.replace(/^::ffff:/, '');
}
