import { ActionIcon, Group, Modal, Title, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'

export const UploadCardTitle = () => {
  const [opened, { open, close }] = useDisclosure(false)
  const { t } = useTranslation()

  return (
    <>
      <Group justify="center">
        <Title order={2}>{t('upload-file')}</Title>
        <ActionIcon variant="transparent" onClick={() => open()}>
          <IconInfoCircle color="black" />
        </ActionIcon>
      </Group>
      <Modal opened={opened} onClose={close} title={t('upload-card.title')} size={'xl'} styles={{
        title: {
          fontWeight: 'var(--mantine-h2-font-weight)',
          fontSize: 'var(--mantine-h2-font-size)'
        },
      }}>
        <Text>{t('upload-card.description')}</Text>
        <Text fw={700} mt='md'>{t('upload-card.rules')}</Text>
        <ol>
          {[...Array(15)].map((_, i) => <li key={i}>{t(`upload-card.info-card.${i}`)}</li>)}
        </ol>
      </Modal>
    </>
  )
}