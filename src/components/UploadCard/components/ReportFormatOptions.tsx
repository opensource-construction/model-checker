import { Checkbox, Group, Switch, Text, Divider, Box, Flex } from '@mantine/core'
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
    <Box mt={5} mb={10}>
      <Divider my='xs' />
      <Flex justify={isIdsValidation ? 'space-between' : 'flex-start'} align='center' wrap='wrap' gap='md' py={10}>
        <Switch
          checked={isIdsValidation}
          onChange={(event) => setIsIdsValidation(event.currentTarget.checked)}
          label={t('ids-validation')}
          size='md'
        />

        {isIdsValidation && (
          <Group gap='xs' py={5} align='center'>
            <Text size='sm' fw={500}>
              {t('report-format')}:
            </Text>
            <Checkbox
              label='HTML'
              checked={reportFormats.html}
              onChange={(e) => setReportFormats({ ...reportFormats, html: e.currentTarget.checked })}
              size='sm'
              styles={{
                input: {
                  transform: 'none',
                },
                inner: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                body: {
                  alignItems: 'center',
                },
                label: {
                  paddingLeft: '4px',
                },
              }}
            />
            <Checkbox
              label='BCF'
              checked={reportFormats.bcf}
              onChange={(e) => setReportFormats({ ...reportFormats, bcf: e.currentTarget.checked })}
              size='sm'
              styles={{
                input: {
                  transform: 'none',
                },
                inner: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                body: {
                  alignItems: 'center',
                },
                label: {
                  paddingLeft: '4px',
                },
              }}
            />
          </Group>
        )}
      </Flex>
    </Box>
  )
}
