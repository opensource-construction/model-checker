export interface IDSRequirement {
  id: string
  description: string
  status: boolean
  failedEntities: string[]
}

export interface IDSSpecification {
  name: string
  requirements: IDSRequirement[]
}

export interface ValidationResult {
  specifications: IDSSpecification[]
  isValid: boolean
  timestamp: string
}

export interface IFCTesterModule {
  validate: (ifcData: ArrayBuffer, idsData: string) => Promise<ValidationResult>
  parseIDS: (idsData: string) => Promise<IDSSpecification[]>
}
