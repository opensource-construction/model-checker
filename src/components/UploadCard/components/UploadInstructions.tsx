import { Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

interface UploadInstructionsProps {
  isIdsValidation: boolean
}

export const UploadInstructions = ({ isIdsValidation }: UploadInstructionsProps) => {
  const { t } = useTranslation()

  return (
    <Stack gap='xs'>
      <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.0`)}</Text>
      <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.1`)}</Text>
      <Text size='sm'>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.2`)}</Text>
      {isIdsValidation && (
        <Text size='sm' c='blue.7'>
          {t('upload-description-ids.3')}
        </Text>
      )}
    </Stack>
  )
}
