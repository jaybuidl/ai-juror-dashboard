import "styled-components";
import type { Theme } from "./styles/theme";

declare module "styled-components" {
  // Mirrors the augmentation in kleros-v2/web/global.d.ts: it makes `theme` typed
  // inside every styled template without each one importing Theme.
  export interface DefaultTheme extends Theme {}
}
