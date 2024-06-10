import { Card } from '@mantine/core'
import { ReactNode } from 'react'

interface PaperProps {
  children?: ReactNode
  'data-testid'?: string
  hide?: boolean
}

export const Paper = (props: PaperProps) => {
  const { children, hide } = props

  if (hide) return children

  return (
    <Card shadow='sm' padding='lg' withBorder data-testid={props['data-testid']} visibleFrom='sm'>
      {children}
    </Card>
  )
}
