import { rules } from './rules.ts'
import { Dispatch } from 'react'
import { ValidationAction } from '@context'
import { PartialResult } from './interfaces.ts'

interface ReadInChunksProps {
  file: File
  dispatch: Dispatch<ValidationAction>
  fileId: string
}

export const readInChunks = async ({ file, dispatch, fileId }: ReadInChunksProps) => {
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
  dispatch: Dispatch<ValidationAction>
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
  // @ts-expect-error issues with combination
  dispatch({ type: 'SET_RESULTS', fileId, payload: { newResults: combinedResults, isLastChunk } })
  if (isLastChunk) {
    dispatch({ type: 'SET_FILE_PROCESSING', fileId, payload: false })
  }
}

export interface RuleResult {
  name: string
  partialResult: PartialResult[] | string[]
  isLastChunk: boolean
  result?: {
    value: PartialResult[] | string[]
    passed: boolean
  }
}

interface CombineResultsProps {
  prevResults: RuleResult[]
  newResults: RuleResult[]
  isLastChunk: boolean
}

export const combineResults = ({ prevResults, newResults, isLastChunk }: CombineResultsProps) => {
  const updatedResults =
    prevResults.length > 0
      ? [...prevResults]
      : newResults.map((res) => ({
          name: res.name,
          result: { value: [], passed: false },
        }))

  newResults.forEach((newResult, index) => {
    const currentResult = updatedResults[index].result!
    const currentValues = currentResult.value

    // Check if the partial result is non-None and not undefined
    if (newResult.partialResult && newResult.partialResult[0] !== 'None' && newResult.partialResult[0] !== undefined) {
      // Specific handling for Project Name, Site Name, and Building Name
      if (['Project Name', 'Site Name', 'Building Name'].includes(updatedResults[index].name)) {
        // Set the value only if no valid value has been set yet
        if (currentValues.length === 0) {
          currentResult.value = newResult.partialResult
        }
      } else {
        // For other fields, append new non-None values ensuring uniqueness
        const nonEmptyResults = newResult.partialResult.filter((x) => x !== 'None')
        // @ts-expect-error issues with combination
        currentResult.value = [...new Set([...currentValues, ...nonEmptyResults])]
      }
    }

    // Update the pass status on the last chunk
    if (isLastChunk) {
      currentResult.passed = rules[index].check(currentResult.value).passed
    }
  })

  return updatedResults
}
