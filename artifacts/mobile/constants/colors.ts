/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#14252B',
    tint: '#138D7B',
    background: '#F3FAF8',
    foreground: '#14252B',
    card: '#FFFFFF',
    cardForeground: '#14252B',
    primary: '#138D7B',
    primaryForeground: '#FFFFFF',
    secondary: '#E4F3EF',
    secondaryForeground: '#1D4941',
    muted: '#EAF1EF',
    mutedForeground: '#71817E',
    accent: '#D8F0E9',
    accentForeground: '#176B5D',
    destructive: '#C94F55',
    destructiveForeground: '#FFFFFF',
    border: '#DDE8E4',
    input: '#DDE8E4',
  },
  dark: {
    text: '#ECF5F2',
    tint: '#5CD0B3',
    background: '#0C191D',
    foreground: '#ECF5F2',
    card: '#14252A',
    cardForeground: '#ECF5F2',
    primary: '#5CD0B3',
    primaryForeground: '#09221E',
    secondary: '#20373A',
    secondaryForeground: '#D8F2EA',
    muted: '#1B3034',
    mutedForeground: '#A0B4AE',
    accent: '#1A443D',
    accentForeground: '#A8E8D6',
    destructive: '#E27A7F',
    destructiveForeground: '#241012',
    border: '#294044',
    input: '#294044',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
