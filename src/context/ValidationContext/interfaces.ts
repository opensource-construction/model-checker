import { Dispatch, ReactNode } from 'react'
import { RuleResult } from '@context'

export interface PartialResult {
  globalId?: string
  name: string
  passed: boolean
}

export type ValidationProps = {
  children: ReactNode
}

export interface SetResultsPayload {
  newResults: RuleResult[]
  isLastChunk: boolean
}

export interface FileMetadata {
  author: string | null
  exported: string | null
}

export interface ValidationAction {
  type: 'SET_FILE' | 'SET_PROGRESS' | 'SET_RESULTS' | 'SET_FILE_PROCESSING' | 'SET_METADATA'
  fileId: string
  payload: string | number | boolean | SetResultsPayload | FileMetadata
}

export interface ValidationState {
  [key: string]: FileState
}

export interface FileState {
  results: FileResult[]
  name: string
  author: string
  exported: string
  progress: number
  fileProcessing: boolean
}

export interface FileResult {
  name: string
  result: {
    value: PartialResult[]
    passed: boolean
  }
}

export interface ValidationContextInterface {
  state: ValidationState
  dispatch: Dispatch<ValidationAction>
}
