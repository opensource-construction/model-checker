import { Progress } from '@mantine/core'

interface ValidationProgressbarProps {
  show: boolean
  progress: number
}

export const ValidationProgressbar = (props: ValidationProgressbarProps) => {
  const { show, progress } = props

  if (!show) return null
  return <Progress value={progress} animated />
}
