import { Group, Paper, ScrollArea, Stack, Text } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
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
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setLoadingDots((dots) => (dots.length >= 3 ? '' : dots + '.'))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isProcessing])

  // Auto-scroll to the latest log entry whenever logs update or processing state changes
  useEffect(() => {
    if (!isHovered) return

    // Slight delay ensures DOM has rendered the new log before scrolling
    const id = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 0)
    return () => clearTimeout(id)
  }, [logs.length, isProcessing, isHovered])

  if (!isProcessing && logs.length === 0) {
    return null
  }

  return (
    <Paper
      withBorder
      p='md'
      style={{
        ...consoleStyles,
        height: isHovered ? '300px' : 'auto',
        overflow: 'hidden',
        cursor: 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role='region'
      aria-label={t('console.loading.processingLogs', 'Processing Logs')}
      aria-expanded={isHovered}
    >
      {isHovered && (
        <Group justify='apart' mb='xs'>
          <Text size='sm' fw={500} c='dimmed'>
            {t('console.loading.processingLogs', 'Processing Logs')}
          </Text>
          <Text size='xs' c='dimmed'>
            {logs.length} {t('console.loading.entries', 'entries')}
          </Text>
        </Group>
      )}

      {isHovered ? (
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
            <div ref={bottomRef} />
          </Stack>
        </ScrollArea>
      ) : (
        <Text
          size='sm'
          title={logs[logs.length - 1] || ''}
          aria-live='polite'
          style={{
            color: 'var(--text-primary)',
            padding: '4px 8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
          }}
        >
          {(logs[logs.length - 1] || (isProcessing ? '' : '')) + (isProcessing ? ` ${loadingDots}` : '')}
        </Text>
      )}
    </Paper>
  )
}
