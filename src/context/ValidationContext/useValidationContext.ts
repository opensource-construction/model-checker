import { useContext } from 'react'
import { ValidationContext } from '@context'

export const useValidationContext = () => {
  const context = useContext(ValidationContext)

  if (context === undefined) {
    throw new Error('useValidationContext was used outside of its Provider')
  }

  return context
}
