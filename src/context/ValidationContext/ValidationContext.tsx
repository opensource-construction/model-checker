import { createContext, Dispatch, ReactNode, useReducer } from 'react'
import { combineResults, RuleResult } from './processIFC.ts'
import { PartialResult } from './interfaces.ts'

interface ValidationState {
  [key: string]: FileState
}

interface FileState {
  results: FileResult[]
  name: string
  progress: number
  fileProcessing: boolean
}

export interface FileResult {
  name: string
  result: {
    value: PartialResult[] | string[]
    passed: boolean
  }
}

interface ValidationContextInterface {
  state: ValidationState
  dispatch: Dispatch<ValidationAction>
}

export const ValidationContext = createContext({} as ValidationContextInterface)

type ValidationProps = {
  children: ReactNode
}

interface SetResultsPayload {
  newResults: RuleResult[]
  isLastChunk: boolean
}

export interface ValidationAction {
  type: 'SET_FILE' | 'SET_PROGRESS' | 'SET_RESULTS' | 'SET_FILE_PROCESSING'
  fileId: string
  payload: string | number | boolean | SetResultsPayload
}

const validationReducer = (state: ValidationState, action: ValidationAction) => {
  const { type, payload, fileId } = action
  switch (type) {
    case 'SET_FILE':
      return {
        ...state,
        [fileId]: { results: [], name: payload as string, progress: 0, fileProcessing: true },
      }
    case 'SET_PROGRESS':
      return {
        ...state,
        [fileId]: { ...state[fileId], progress: payload as number },
      }
    case 'SET_RESULTS':
      // console.log('RESULTS', fileId, payload, state[fileId].results)
      return {
        ...state,
        [fileId]: {
          ...state[fileId],
          // @ts-expect-error issues with combination
          results: combineResults({ ...(payload as object), prevResults: state[fileId].results }),
        },
      }
    case 'SET_FILE_PROCESSING':
      return {
        ...state,
        [fileId]: { ...state[fileId], fileProcessing: payload as boolean },
      }
    default:
      return state
  }
}

export const ValidationContextProvider = ({ children }: ValidationProps) => {
  // @ts-expect-error issues with empty object
  const [state, dispatch] = useReducer(validationReducer, {} as ValidationState)

  return <ValidationContext.Provider value={{ state, dispatch }}>{children}</ValidationContext.Provider>
}
