import { rules } from './rules.ts'
import { PartialResult } from './interfaces.ts'

export interface RuleResult {
  name: string
  partialResult: PartialResult[]
  isLastChunk: boolean
  result?: {
    value: PartialResult[]
    passed: boolean | null
  }
}

interface CombineResultsProps {
  prevResults: RuleResult[]
  newResults: RuleResult[]
  isLastChunk: boolean
}

const sanitizeIFCContent = (content: string): string => {
  return content.replace(/=\s+/g, '=') // Remove space right after '='
}

export const combineResults = ({ prevResults, newResults, isLastChunk }: CombineResultsProps): RuleResult[] => {
  const updatedResults =
    prevResults.length > 0
      ? [...prevResults]
      : newResults.map((res) => ({
          name: res.name,
          partialResult: [],
          isLastChunk: res.isLastChunk,
          result: { value: [], passed: false },
        }))

  newResults.forEach((newResult) => {
    const existingResultIndex = updatedResults.findIndex((result) => result.name === newResult.name)
    if (existingResultIndex !== -1) {
      const currentResult = updatedResults[existingResultIndex].result!
      currentResult.value = [...currentResult.value, ...newResult.partialResult]
    } else {
      updatedResults.push({
        ...newResult,
        result: {
          value: newResult.partialResult,
          passed: false,
        },
      })
    }
  })

  if (isLastChunk) {
    updatedResults.forEach((result) => {
      const rule = rules.find((rule) => rule.name === result.name)
      if (rule) {
        result.result = rule.check(result.result!.value as PartialResult[])
      }
    })
  }

  return updatedResults
}

export const processIFCContent = (content: string): string => {
  return sanitizeIFCContent(content)
}
