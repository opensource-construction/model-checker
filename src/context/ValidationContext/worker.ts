import { rules } from './rules.ts'

interface ReadInChunksProps {
  file: File
  dispatch: (message: object, options?: WindowPostMessageOptions) => void
  fileId: string
}

export const readInChunks = ({ file, dispatch, fileId }: ReadInChunksProps) => {
  const chunkSize = 1024 * 1024 * 5 // 5 MB
  let offset = 0
  const totalSize = file.size

  const fileReader = new FileReader()

  fileReader.onload = (e) => {
    if (!e.target || !e.target.result) return
    processContentChunk({
      chunk: e.target.result as string,
      isLastChunk: offset + chunkSize >= totalSize,
      totalSize,
      currentOffset: offset + chunkSize,
      dispatch,
      fileId,
    })
    offset += chunkSize
    if (offset < totalSize) {
      readNextChunk()
    }
  }

  fileReader.onerror = (e) => {
    console.error('Error reading file', e)
  }

  const readNextChunk = () => {
    const slice = file.slice(offset, offset + chunkSize)
    fileReader.readAsText(slice)
  }

  readNextChunk()
}

interface ProcessContentChunkProps {
  chunk: string
  isLastChunk: boolean
  totalSize: number
  currentOffset: number
  dispatch: (message: object, options?: WindowPostMessageOptions) => void
  fileId: string
}

const processContentChunk = ({
  chunk,
  isLastChunk,
  totalSize,
  currentOffset,
  dispatch,
  fileId,
}: ProcessContentChunkProps) => {
  const combinedResults = rules.map((rule) => {
    const partialResult = rule.process({ content: chunk, regex: rule.regex }) || []
    return {
      name: rule.name,
      partialResult: Array.isArray(partialResult) ? partialResult : [partialResult],
      isLastChunk: isLastChunk,
    }
  })

  dispatch({ type: 'SET_PROGRESS', fileId, payload: (currentOffset / totalSize) * 100 })
  dispatch({ type: 'SET_RESULTS', fileId, payload: { newResults: combinedResults, isLastChunk } })
  if (isLastChunk) {
    dispatch({ type: 'SET_FILE_PROCESSING', fileId, payload: false })
  }
}

interface WorkerProps {
  file: File
  fileId: string
}

onmessage = (e: MessageEvent<WorkerProps>) => {
  const { file, fileId } = e.data
  readInChunks({ file, fileId, dispatch: postMessage })
}
