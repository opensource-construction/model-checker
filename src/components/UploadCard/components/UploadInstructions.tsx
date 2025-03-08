import { Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

interface UploadInstructionsProps {
  isIdsValidation: boolean
}

export const UploadInstructions = ({ isIdsValidation }: UploadInstructionsProps) => {
  const { t } = useTranslation()

  return (
    <Stack gap='md' mt={5}>
      <Text fw={700}>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.0`)}</Text>
      <Text>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.1`)}</Text>
      {!isIdsValidation && <Text fw={700}>{t('upload-description.2')}</Text>}
      <Text>{t(`${isIdsValidation ? 'upload-description-ids' : 'upload-description'}.3`)}</Text>
      {isIdsValidation && <Text>{t('upload-description-ids.4')}</Text>}
    </Stack>
  )
}
