import { Alert, Button, Group, Text } from '@mantine/core'
import { IconDownload, IconFileText } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { ValidationResult } from '../../../types/validation'
import { BcfData } from '../../../utils/bcfUtils'
import { ProcessedResult } from '../hooks/useFileProcessor'

interface ResultsDisplayProps {
  processedResults: ProcessedResult[]
  reportFormats: {
    html: boolean
    bcf: boolean
  }
  onHtmlReport: (result: ValidationResult, fileName: string) => void
  onBcfDownload: (result: {
    fileName: string
    result: {
      bcf_data?: BcfData
    }
  }) => void
}

export const ResultsDisplay = ({
  processedResults,
  reportFormats,
  onHtmlReport,
  onBcfDownload,
}: ResultsDisplayProps) => {
  const { t } = useTranslation()

  // Add smooth scrolling effect when results are displayed
  useEffect(() => {
    if (processedResults.length > 0) {
      // Scroll to bottom of the page with smooth animation
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [processedResults])

  if (processedResults.length === 0) {
    return null
  }

  return (
    <Alert color='green' variant='light'>
      <Text>{t('console.success.processingComplete', 'Your files have been processed.')}</Text>
      <Group mt='md' gap='sm'>
        {processedResults.map((result, index) => (
          <Group key={index} gap='xs'>
            {reportFormats.html && (
              <Button
                onClick={() => onHtmlReport(result.result, result.fileName)}
                color='yellow'
                variant='outline'
                size='sm'
                fw={500}
                className='report-button'
                leftSection={<IconFileText size={16} />}
                styles={{
                  root: {
                    border: '2px solid var(--mantine-color-yellow-filled)',
                    color: 'var(--mantine-color-dark-6)',
                    backgroundColor: 'var(--mantine-color-yellow-1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'var(--mantine-color-yellow-2)',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 8px rgba(255, 213, 0, 0.35)',
                    },
                    '&:active': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 2px 4px rgba(255, 213, 0, 0.35)',
                    },
                  },
                }}
              >
                HTML - {result.fileName}
              </Button>
            )}
            {reportFormats.bcf && (
              <Button
                onClick={() => onBcfDownload(result)}
                variant='outline'
                size='sm'
                fw={500}
                className='report-button'
                leftSection={<IconDownload size={16} />}
                styles={{
                  root: {
                    border: '2px solid var(--mantine-color-blue-filled)',
                    color: 'var(--mantine-color-dark-6)',
                    backgroundColor: 'var(--mantine-color-blue-1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'var(--mantine-color-blue-2)',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 8px rgba(0, 145, 255, 0.35)',
                    },
                    '&:active': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 2px 4px rgba(0, 145, 255, 0.35)',
                    },
                  },
                }}
              >
                BCF - {result.fileName}
              </Button>
            )}
          </Group>
        ))}
      </Group>
    </Alert>
  )
}
