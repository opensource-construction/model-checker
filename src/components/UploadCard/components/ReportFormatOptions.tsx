import { Checkbox, Group, Switch, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

interface ReportFormatOptionsProps {
  isIdsValidation: boolean
  setIsIdsValidation: (value: boolean) => void
  reportFormats: {
    html: boolean
    bcf: boolean
  }
  setReportFormats: (formats: { html: boolean; bcf: boolean }) => void
}

export const ReportFormatOptions = ({
  isIdsValidation,
  setIsIdsValidation,
  reportFormats,
  setReportFormats,
}: ReportFormatOptionsProps) => {
  const { t } = useTranslation()

  return (
    <Group align='center'>
      <Switch
        checked={isIdsValidation}
        onChange={(event) => setIsIdsValidation(event.currentTarget.checked)}
        label={t('ids-validation')}
        size='md'
      />

      {isIdsValidation && (
        <Group gap='xs'>
          <Text size='sm' fw={500}>
            {t('report-format')}:
          </Text>
          <Group gap='xs'>
            <Checkbox
              label='HTML'
              checked={reportFormats.html}
              onChange={(e) => setReportFormats({ ...reportFormats, html: e.currentTarget.checked })}
              size='sm'
            />
            <Checkbox
              label='BCF'
              checked={reportFormats.bcf}
              onChange={(e) => setReportFormats({ ...reportFormats, bcf: e.currentTarget.checked })}
              size='sm'
            />
          </Group>
        </Group>
      )}
    </Group>
  )
}
