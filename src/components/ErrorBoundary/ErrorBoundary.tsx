import * as React from 'react'
import { Center, Title } from '@mantine/core'
import { ErrorMessage } from '@components'

interface Props {
  children?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | undefined
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: undefined,
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ margin: '1em' }}>
          <ErrorMessage error={this.state.error} />
          <br />
          <Center>
            <Title order={3}>Try going back or refresh the page</Title>
          </Center>
        </div>
      )
    }

    return this.props.children
  }
}
