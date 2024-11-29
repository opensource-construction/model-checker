import { Button, createTheme, rem } from '@mantine/core'

export const theme = createTheme({
  fontFamily: 'Poppins, sans-serif',
  headings: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
  },
  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(16),
    lg: rem(18),
    xl: rem(20),
  },
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
    xxl: '120em',
  },
  defaultRadius: rem(4),  // Slight default rounding
  primaryColor: 'yellow',
  primaryShade: 5,
  colors: {
    yellow: [
      '#fff9d9',
      '#fff7cc',
      '#fff4b0',
      '#fff193',
      '#ffee76',
      '#ffee09',  // Primary yellow
      '#e6d608',
      '#ccbe07',
      '#b3a706',
      '#999005',
    ],
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#1a1b26',  // Tokyo Night dark background
      '#24283b',  // Tokyo Night secondary background
      '#16161e',  // Tokyo Night darker shade
      '#13131a',  // Tokyo Night darkest shade
    ],
  },
  components: {
    Button: Button.extend({
      defaultProps: {
        color: 'yellow',
      },
    }),
    Paper: {
      defaultProps: {
        p: 'md',  // Default padding for all Paper components (including cards)
        radius: 'sm',  // Slight rounding
      },
    },
  },
})
