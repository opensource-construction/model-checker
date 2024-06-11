import { ActionIcon, Group, Text, useMatches } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { IconBrandGithub } from '@tabler/icons-react'
import righettiLogo from 'assets/righetti_partner_logo.png'

export const Footer = () => {
  const { t } = useTranslation()
  const githubLink = 'https://github.com/opensource-construction/model-checker'
  const textSize = useMatches({ base: 'xs', lg: 'sm' })

  return (
    <Group justify='space-between'>
      <Group>
        <Text size={textSize}>{t('sponsored-by')}</Text>
        <img
          src={righettiLogo}
          alt='Righetti and Parter'
          style={{ maxWidth: useMatches({ base: '72px', lg: '200px' }) }}
        />
      </Group>
      <Group>
        <Text size={textSize}>{t('open-source')}</Text>
        <ActionIcon
          component='a'
          href={githubLink}
          target='_blank'
          variant='transparent'
          color='black'
          size={useMatches({ base: 16, lg: 32 })}
        >
          <IconBrandGithub />
        </ActionIcon>
      </Group>
    </Group>
  )
}
