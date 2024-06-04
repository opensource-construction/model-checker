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
  defaultRadius: '0',
  primaryColor: 'yellow',
  primaryShade: 6,
  colors: {
    yellow: [
      '#ffffe2',
      '#fffccc',
      '#fff89b',
      '#fff464',
      '#fff139',
      '#ffef1d',
      '#ffee09',
      '#e3d300',
      '#c9bb00',
      '#ada100',
    ],
    blue: [
      '#eaeaff',
      '#cfd0ff',
      '#9c9cff',
      '#6464ff',
      '#3736fe',
      '#1b19fe',
      '#0909ff',
      '#0000e4',
      '#0000cc',
      '#0000b4',
    ],
    violet: [
      '#ffe9ff',
      '#ffd0ff',
      '#fc9efc',
      '#fa6afa',
      '#f83ef8',
      '#f824f8',
      '#f715f7',
      '#dd06dd',
      '#c500c5',
      '#ac00ad',
    ],
  },
  other: {
    backgroundColor: '#fafbff',
  },
  components: {
    Button: Button.extend({
      defaultProps: {
        variant: 'filled',
        autoContrast: true,
      },
    }),
  },
})
