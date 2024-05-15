import { readInChunks, ValidationAction } from '@context'
import { Dispatch } from 'react'

interface processFileProps {
  file: File
  dispatch: Dispatch<ValidationAction>
  fileId: string
}

export const processFile = (props: processFileProps) => {
  readInChunks(props)
}
