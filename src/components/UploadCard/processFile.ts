import { ValidationAction } from '@context'
import { Dispatch } from 'react'

interface processFileProps {
  file: File
  dispatch: Dispatch<ValidationAction>
  fileId: string
}

export const processFile = async (props: processFileProps) => {
  const { fileId, dispatch, file } = props

  dispatch({ type: 'SET_FILE', payload: fileId, fileId })
  const worker = new Worker(new URL('/src/context/ValidationContext/worker.ts', import.meta.url), { type: 'module' })
  worker.postMessage({ file, fileId })
  worker.onmessage = (e) => {
    dispatch(e.data)
  }
  dispatch({ type: 'SET_METADATA', payload: await getAuthorAndExported(file), fileId })
}

const getAuthorAndExported = async (file: File) => {
  // Assume author and exported are in the first 64kB of the file
  const fileSlice = file.slice(0, 1024 * 64)

  const chunk = await fileSlice.text()
  return {
    author: /\d+=IFCORGANIZATION\(\$,'([^']*)'/.exec(chunk)?.[1] || null,
    exported: /FILE_NAME\('[^']+','([^']+)'/g.exec(chunk)?.[1] || null,
  }
}
