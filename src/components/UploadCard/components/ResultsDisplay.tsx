import { Alert, Button, Group, Text, Tooltip } from '@mantine/core'
import { IconDownload, IconFileText } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useEffect, RefObject } from 'react'
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
  onHtmlDownload: (result: ValidationResult) => Promise<void>
  onBcfDownload: (result: {
    fileName: string
    result: {
      bcf_data?: BcfData
    }
  }) => void
  resultsRef?: RefObject<HTMLDivElement>
}

export const ResultsDisplay = ({
  processedResults,
  reportFormats,
  onHtmlReport,
  onHtmlDownload,
  onBcfDownload,
  resultsRef,
}: ResultsDisplayProps) => {
  const { t } = useTranslation()

  // Add smooth scrolling effect when results are displayed
  useEffect(() => {
    if (processedResults.length > 0) {
      // Scroll to bottom of the page with smooth animation
      setTimeout(() => {
        if (resultsRef?.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth',
          })

          // Add a fallback in case the first attempt doesn't work
          setTimeout(() => {
            const resultsElement = document.querySelector('.report-button')
            if (resultsElement) {
              resultsElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 100)
        }
      }, 100)
    }
  }, [processedResults, resultsRef])

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
              <Button.Group style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
                <Button
                  onClick={() => onHtmlReport(result.result, result.fileName)}
                  color='yellow'
                  variant='filled'
                  size='sm'
                  fw={600}
                  className='report-button'
                  leftSection={<IconFileText size={16} />}
                  styles={{
                    root: {
                      borderTopLeftRadius: 10,
                      borderBottomLeftRadius: 10,
                      paddingInline: '14px',
                      background:
                        'linear-gradient(135deg, var(--mantine-color-yellow-6), var(--mantine-color-yellow-5))',
                      color: 'var(--mantine-color-dark-9)',
                      transition: 'transform 120ms ease, box-shadow 120ms ease, background 200ms ease',
                      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.1)',
                      '&:hover': {
                        background:
                          'linear-gradient(135deg, var(--mantine-color-yellow-7), var(--mantine-color-yellow-6))',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 14px rgba(255, 213, 0, 0.25)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                    },
                  }}
                >
                  View HTML - {result.fileName}
                </Button>
                <Tooltip label={t('downloadHtmlTooltip', 'Download HTML report')} withArrow>
                  <Button
                    onClick={() => onHtmlDownload(result.result)}
                    color='yellow'
                    variant='subtle'
                    size='sm'
                    aria-label='Download HTML'
                    styles={{
                      root: {
                        borderTopRightRadius: 10,
                        borderBottomRightRadius: 10,
                        paddingInline: 10,
                        backgroundColor: 'var(--mantine-color-yellow-1)',
                        transition: 'transform 120ms ease, box-shadow 120ms ease, background 200ms ease',
                        '&:hover': {
                          backgroundColor: 'var(--mantine-color-yellow-2)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 14px rgba(255, 213, 0, 0.25)',
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      },
                    }}
                  >
                    <IconDownload size={16} />
                  </Button>
                </Tooltip>
              </Button.Group>
            )}
            {reportFormats.bcf && (
              <Button
                onClick={() => onBcfDownload(result)}
                variant='outline'
                size='sm'
                fw={600}
                className='report-button'
                leftSection={<IconDownload size={16} />}
                styles={{
                  root: {
                    borderRadius: 6,
                    paddingInline: '14px',
                    border: '2px solid var(--mantine-color-blue-6)',
                    color: 'var(--mantine-color-blue-7)',
                    backgroundColor: 'transparent',
                    transition: 'transform 120ms ease, box-shadow 120ms ease, background-color 160ms ease',
                    '&:hover': {
                      backgroundColor: 'var(--mantine-color-blue-0)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 12px rgba(0, 145, 255, 0.18)',
                    },
                    '&:active': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 3px 8px rgba(0, 145, 255, 0.20)',
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
