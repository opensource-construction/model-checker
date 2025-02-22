import { Progress, useMantineColorScheme } from '@mantine/core'

interface ValidationProgressbarProps {
  show: boolean
  progress: number
}

export const ValidationProgressbar = ({ show, progress }: ValidationProgressbarProps) => {
  const { colorScheme } = useMantineColorScheme()
  // Override the progress bar color so that in light mode we use #0909ff instead of the default (#228be6)
  const progressColor = colorScheme === 'light' ? '#0909ff' : 'blue'

  if (!show) return null

  return <Progress value={progress} color={progressColor} />
} 