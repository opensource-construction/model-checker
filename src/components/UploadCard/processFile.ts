import { ValidationAction } from '@context'
import { Dispatch } from 'react'

interface processFileProps {
  file: File
  dispatch: Dispatch<ValidationAction>
  fileId: string
}

export const processFile = (props: processFileProps) => {
  const { fileId, dispatch, file } = props

  dispatch({ type: 'SET_FILE', payload: fileId, fileId })
  const worker = new Worker('/src/context/ValidationContext/worker.ts', { type: 'module' })
  worker.postMessage({ file, fileId })
  worker.onmessage = (e) => {
    //console.log("Message received from worker", e.data);
    dispatch(e.data)
  }
}
