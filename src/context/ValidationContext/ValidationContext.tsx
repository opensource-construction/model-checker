import { createContext, useReducer } from 'react'
import { combineResults } from './processIFC.ts'
import {
  FileMetadata,
  ValidationAction,
  ValidationContextInterface,
  ValidationProps,
  ValidationState,
} from './interfaces.ts'

export const ValidationContext = createContext({} as ValidationContextInterface)

const validationReducer = (state: ValidationState, action: ValidationAction) => {
  const { type, payload, fileId } = action
  switch (type) {
    case 'SET_FILE':
      return {
        ...state,
        [fileId]: { results: [], name: payload as string, progress: 0, fileProcessing: true },
      }
    case 'SET_METADATA':
      return {
        ...state,
        [fileId]: { ...state[fileId], ...(payload as FileMetadata) },
      }
    case 'SET_PROGRESS':
      return {
        ...state,
        [fileId]: { ...state[fileId], progress: payload as number },
      }
    case 'SET_RESULTS':
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
