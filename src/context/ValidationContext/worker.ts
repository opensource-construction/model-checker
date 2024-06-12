import { rules } from './rules'
import { Dispatch } from 'react'
import { ValidationAction } from '@context'
import { processIFCContent } from './processIFC';

interface ReadInChunksProps {
  file: File
  dispatch: (message: object, options?: WindowPostMessageOptions) => void
  fileId: string
}

interface CollectedData {
  content: string[]
  storeyData: { [key: string]: string }
}

const collectStoreyData = (content: string, storeyData: { [key: string]: string }) => {
  const relContainedRegex = /#\s*(\d+)\s*=\s*IFCRELCONTAINEDINSPATIALSTRUCTURE\s*\(\s*[^,]*\s*,\s*[^,]*\s*,\s*.*?\s*,\s*(\([^)]*\))\s*,\s*#\s*(\d+)\s*\);/gi;
  let match
  while ((match = relContainedRegex.exec(content)) !== null) {
    const entityList = match[2]
    const storeyId = match[3]
    const entities = entityList.match(/#(\d+)/g)
    if (entities) {
      entities.forEach((entity) => {
        storeyData[entity.replace('#', '')] = storeyId
      })
    }
  }
}

const collectDataFromChunks = (collectedData: CollectedData, chunk: string) => {
  const sanitizedChunk = processIFCContent(chunk);
  collectedData.content.push(sanitizedChunk);
  collectStoreyData(sanitizedChunk, collectedData.storeyData);
};

const processCollectedData = (collectedData: CollectedData, dispatch: Dispatch<ValidationAction>, fileId: string) => {
  const fullContent = collectedData.content.join('')
  const combinedResults = rules.map((rule) => {
    const partialResult =
      rule.process({
        content: fullContent,
        regex: rule.regex,
        storeyData: collectedData.storeyData,
      }) || []
    return {
      name: rule.name,
      partialResult: Array.isArray(partialResult) ? partialResult : [partialResult],
      isLastChunk: true,
    }
  })

  dispatch({ type: 'SET_RESULTS', fileId, payload: { newResults: combinedResults, isLastChunk: true } })
  dispatch({ type: 'SET_FILE_PROCESSING', fileId, payload: false })
}

export const readInChunks = ({ file, dispatch, fileId }: ReadInChunksProps) => {
  const chunkSize = 1024 * 1024 * 5 // 5 MB
  let offset = 0
  const totalSize = file.size

  const collectedData: CollectedData = { content: [], storeyData: {} }

  const fileReader = new FileReader()

  fileReader.onload = (e) => {
    if (!e.target || !e.target.result) return
    const chunk = e.target.result as string
    collectDataFromChunks(collectedData, chunk)
    offset += chunkSize
    dispatch({ type: 'SET_PROGRESS', fileId, payload: (offset / totalSize) * 100 })

    if (offset < totalSize) {
      readNextChunk()
    } else {
      processCollectedData(collectedData, dispatch, fileId)
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

interface WorkerProps {
  file: File
  fileId: string
}

onmessage = (e: MessageEvent<WorkerProps>) => {
  const { file, fileId } = e.data
  readInChunks({ file, fileId, dispatch: postMessage })
}
