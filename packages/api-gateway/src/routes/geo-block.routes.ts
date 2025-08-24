import { Router } from 'express';
import { GeoBlockController } from '../controllers/geo-block.controller';
import { requireAdmin } from '../middleware/role-guard.middleware';

const router: Router = Router();

router.post('/whitelist/ip', requireAdmin, GeoBlockController.addToIpWhiteList);
router.post('/blacklist/ip', requireAdmin, GeoBlockController.addToIpBlacklist);
router.post(
  '/blocklist/country',
  requireAdmin,
  GeoBlockController.addToCountryBlocklist
);

router.delete(
  '/whitelist/ip/:ip',
  requireAdmin,
  GeoBlockController.removeFromIpWhiteList
);
router.delete(
  '/blacklist/ip/:ip',
  requireAdmin,
  GeoBlockController.removeFromIpBlacklist
);
router.delete(
  '/blocklist/country/:countryCode',
  requireAdmin,
  GeoBlockController.removeFromCountryBlocklist
);

export { router as geoBlockRoutes };
