import { Group, Paper, ScrollArea, Stack, Text } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ProcessingConsoleProps {
  isProcessing: boolean
  logs: string[]
}

const consoleStyles = {
  position: 'fixed',
  bottom: '60px', // Above footer
  right: '20px',
  width: '270px',
  maxHeight: '300px',
  zIndex: 1000,
  borderRadius: '8px',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-secondary)',
  transition: 'all var(--theme-transition)',
} as const

export const ProcessingConsole = ({ isProcessing, logs }: ProcessingConsoleProps) => {
  const { t } = useTranslation()
  const [loadingDots, setLoadingDots] = useState('')

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setLoadingDots((dots) => (dots.length >= 3 ? '' : dots + '.'))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isProcessing])

  if (!isProcessing && logs.length === 0) {
    return null
  }

  return (
    <Paper withBorder p='md' style={consoleStyles}>
      <Group justify='apart' mb='xs'>
        <Text size='sm' fw={500} c='dimmed'>
          {t('console.loading.processingLogs', 'Processing Logs')}
        </Text>
        <Text size='xs' c='dimmed'>
          {logs.length} {t('console.loading.entries', 'entries')}
        </Text>
      </Group>

      <ScrollArea h={200} offsetScrollbars>
        <Stack gap='xs'>
          {logs.map((log, index) => (
            <Text
              key={index}
              size='sm'
              style={{
                color: 'var(--text-primary)',
                padding: '4px 8px',
                backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'transparent',
                borderRadius: '4px',
              }}
            >
              {log}
            </Text>
          ))}
          {isProcessing && (
            <Text
              size='sm'
              style={{
                color: 'var(--text-secondary)',
                padding: '4px 8px',
              }}
            >
              {loadingDots}
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Paper>
  )
}
