import { ActionIcon, Group, Modal, Title, Text, Box } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'

interface UploadCardTitleProps {
  isIdsValidation: boolean
}

export const UploadCardTitle = ({ isIdsValidation }: UploadCardTitleProps) => {
  const [opened, { open, close }] = useDisclosure(false)
  const { t } = useTranslation()

  return (
    <>
      <Box sx={{ textAlign: 'center', position: 'relative' }}>
        <Title order={2} ta='center' mb={5}>
          {t('upload-file')}
        </Title>
        <ActionIcon
          variant='transparent'
          onClick={() => open()}
          sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
        >
          <IconInfoCircle color='black' />
        </ActionIcon>
      </Box>
      <Modal
        opened={opened}
        onClose={close}
        title={t('upload-card.title')}
        size={'xl'}
        styles={{
          title: {
            fontWeight: 'var(--mantine-h2-font-weight)',
            fontSize: 'var(--mantine-h2-font-size)',
          },
        }}
      >
        <Text>{t('upload-card.description')}</Text>
        {!isIdsValidation && (
          <>
            <Text fw={700} mt='md'>
              {t('upload-card.rules')}
            </Text>
            <ol>
              {[...Array(15)].map((_, i) => (
                <li key={i}>{t(`upload-card.info-card.${i}`)}</li>
              ))}
            </ol>
          </>
        )}
      </Modal>
    </>
  )
}
