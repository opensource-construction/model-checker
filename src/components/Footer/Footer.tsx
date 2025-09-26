import { ActionIcon, Group, Text, useMatches } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { IconBrandGithub } from '@tabler/icons-react'
import righettiLogo from 'assets/righetti_partner_logo.png'
import { useTheme } from '@context'

export const Footer = () => {
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const githubLink = 'https://github.com/opensource-construction/model-checker'
  const textSize = useMatches({ base: 'xs', lg: 'sm' })

  return (
    <Group w='100%' justify='space-between' align='center' style={{ flexWrap: 'nowrap' }}>
      <Group gap='xs' wrap='nowrap' align='center'>
        <Text size={textSize}>{t('sponsored-by')}</Text>
        <a
          href='https://www.righettipartner.ch/'
          target='_blank'
          rel='noopener noreferrer'
          style={{ display: 'inline-flex' }}
        >
          <img
            src={righettiLogo}
            alt='Righetti and Partner'
            style={{
              maxWidth: useMatches({ base: '72px', lg: '200px' }),
              height: 'auto',
              display: 'block',
              filter: isDarkMode
                ? 'invert(89%) sepia(58%) saturate(638%) hue-rotate(359deg) brightness(97%) contrast(91%) drop-shadow(0 -1px 2px rgba(255, 238, 9, 0.2))'
                : 'none',
              transition: 'filter 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              // Adds inverted gradient and smooth transition
            }}
          />
        </a>
      </Group>
      <Group gap='xs' wrap='nowrap' align='center'>
        <Text size={textSize}>{t('open-source')}</Text>
        <ActionIcon
          component='a'
          href={githubLink}
          target='_blank'
          variant='transparent'
          color={isDarkMode ? 'yellow.5' : 'dark'}
          size={useMatches({ base: 16, lg: 32 })}
        >
          <IconBrandGithub />
        </ActionIcon>
      </Group>
    </Group>
  )
}
