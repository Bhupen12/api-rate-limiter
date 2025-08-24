import { Router } from 'express';
import { GeoBlockController } from '../../controllers/geo-block.controller';

const {
  addToIpWhiteList,
  addToIpBlacklist,
  addToCountryBlocklist,
  removeFromIpWhiteList,
  removeFromIpBlacklist,
  removeFromCountryBlocklist,
} = GeoBlockController;

const router: Router = Router();

router.post('/whitelist/ip', addToIpWhiteList);
router.post('/blacklist/ip', addToIpBlacklist);
router.post('/blocklist/country', addToCountryBlocklist);

router.delete('/whitelist/ip/:ip', removeFromIpWhiteList);
router.delete('/blacklist/ip/:ip', removeFromIpBlacklist);
router.delete('/blocklist/country/:countryCode', removeFromCountryBlocklist);

export { router as geoBlockRoutes };
