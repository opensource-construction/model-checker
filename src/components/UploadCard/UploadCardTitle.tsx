import { ActionIcon, Modal, Title, Text, Flex, Anchor, Space } from '@mantine/core'
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
      <Flex justify='center' align='center' gap={5} mb={15}>
        <Title order={2} style={{ display: 'inline', marginRight: '5px' }}>
          {t('upload-file')}
        </Title>
        <ActionIcon
          variant='transparent'
          size='md'
          onClick={() => open()}
          aria-label='Information'
          style={{ marginTop: '2px' }}
        >
          <IconInfoCircle size={22} stroke={1.5} color='black' />
        </ActionIcon>
      </Flex>
      <Modal
        opened={opened}
        onClose={close}
        title={t(isIdsValidation ? 'upload-card.ids-title' : 'upload-card.title')}
        size={'xl'}
        styles={{
          title: {
            fontWeight: 'var(--mantine-h2-font-weight)',
            fontSize: 'var(--mantine-h2-font-size)',
          },
        }}
      >
        <Text>{t(isIdsValidation ? 'upload-card.ids-description' : 'upload-card.description')}</Text>

        {isIdsValidation ? (
          <>
            <Space h='md' />
            <Text fw={700}>{t('upload-card.ids-info.about-title')}</Text>
            <Text size='sm'>{t('upload-card.ids-info.about-text')}</Text>
            <Text size='sm' mt='xs'>
              {t('upload-card.ids-info.about-link-text')}{' '}
              <Anchor
                href='https://www.buildingsmart.org/standards/bsi-standards/information-delivery-specification-ids/'
                target='_blank'
                rel='noopener noreferrer'
                c='blue'
              >
                {t('upload-card.ids-info.about-link')}
              </Anchor>
            </Text>

            <Space h='md' />
            <Text fw={700}>{t('upload-card.ids-info.how-it-works-title')}</Text>
            <Text size='sm'>{t('upload-card.ids-info.how-it-works-text')}</Text>
            <Text size='sm' mt='xs'>
              {t('upload-card.ids-info.how-it-works-security')}
            </Text>
            <Text size='sm' mt='xs'>
              {t('upload-card.ids-info.wasm-link-text')}{' '}
              <Anchor href='https://webassembly.org/' target='_blank' rel='noopener noreferrer' c='blue'>
                {t('upload-card.ids-info.wasm-link')}
              </Anchor>
            </Text>
          </>
        ) : (
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
