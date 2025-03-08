import { Card, CardProps } from '@mantine/core'
import { ReactNode } from 'react'

interface PaperProps extends Omit<CardProps, 'children'> {
  children?: ReactNode
  'data-testid'?: string
  hide?: boolean
  className?: string
}

export const Paper = (props: PaperProps) => {
  const { children, hide, className, 'data-testid': dataTestId, ...otherProps } = props

  if (hide) return children

  return (
    <Card shadow='sm' padding='lg' withBorder data-testid={dataTestId} className={className} {...otherProps}>
      {children}
    </Card>
  )
}
