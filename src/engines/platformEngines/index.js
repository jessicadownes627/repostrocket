import { mercariEngine } from "./mercariEngine";
import { poshmarkEngine } from "./poshmarkEngine";
import { ebayEngine } from "./ebayEngine";
import { fbmEngine } from "./fbmEngine";
import { depopEngine } from "./depopEngine";
import { vintedEngine } from "./vintedEngine";

export const PLATFORM_ENGINES = {
  mercari: mercariEngine,
  poshmark: poshmarkEngine,
  ebay: ebayEngine,
  facebook: fbmEngine,
  depop: depopEngine,
  vinted: vintedEngine,
};
