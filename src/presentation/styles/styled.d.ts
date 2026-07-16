import 'styled-components';
import type { AppTheme } from './theme';

// Give styled-components' `theme` prop full type-safety across the app.
declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
