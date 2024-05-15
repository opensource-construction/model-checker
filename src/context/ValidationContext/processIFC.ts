import { rules } from './rules.ts'
import { PartialResult } from './interfaces.ts'

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
