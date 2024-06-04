import { ActionIcon, Group, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { IconBrandGithub } from '@tabler/icons-react'
import righettiLogo from 'assets/righetti_partner_logo.png'

export const Footer = () => {
  const { t } = useTranslation()
  const githubLink = 'https://github.com/opensource-construction/model-checker'

  return (
    <Group justify='space-between'>
      <Group>
        <Text>{t('sponsored-by')}</Text>
        <img src={righettiLogo} alt='Righetti and Parter' style={{ maxWidth: '200px' }} />
      </Group>
      <Group>
        <Text>{t('open-source')}</Text>
        <ActionIcon component='a' href={githubLink} target='_blank' variant='transparent' color='black'>
          <IconBrandGithub />
        </ActionIcon>
      </Group>
    </Group>
  )
}
