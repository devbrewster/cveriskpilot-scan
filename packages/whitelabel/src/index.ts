// @cveriskpilot/whitelabel
export { BrandConfigService } from './config';
export { createDomainOrgResolver, whiteLabelMiddleware } from './middleware';
export type {
  WhiteLabelMiddlewareOptions,
  WhiteLabelRequest,
  WhiteLabelResult,
} from './middleware';
export {
  generateCSSVars,
  generateStylesheet,
  generateTailwindTheme,
  isValidHexColor,
  validateThemeColors,
} from './theme';
export type { TailwindBrandTheme } from './theme';
export type {
  BrandConfig,
  EmailBrandConfig,
  LogoConfig,
  ThemeColors,
  WhiteLabelSettings,
} from './types';
