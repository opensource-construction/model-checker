export interface ExtraTypeInfo {
  type?: string
  value?: string | number | boolean
  properties?: Record<string, unknown>
  [key: string]: unknown
}

export interface ValidationEntity {
  class: string
  predefined_type: string
  name: string
  description: string
  global_id: string
  tag: string
  type_name?: string
  type_tag?: string
  type_global_id?: string
  extra_of_type?: ExtraTypeInfo
  reason?: string
}

export interface ValidationRequirement {
  description: string
  status: boolean | 'skipped'
  total_checks: number
  total_pass: number
  total_fail: number
  total_applicable?: number
  passed_entities?: ValidationEntity[]
  failed_entities?: ValidationEntity[]
  has_omitted_passes?: boolean
  total_omitted_passes?: number
  total_passed_entities?: number
  has_omitted_failures?: boolean
  total_omitted_failures?: number
  total_failed_entities?: number
  extra_of_type?: ExtraTypeInfo
}

export interface ValidationSpecification {
  name: string
  status: boolean | 'skipped'
  status_text?: string
  description: string
  instructions?: string
  percent_checks_pass: number
  total_checks: number
  total_checks_pass: number
  total_checks_fail?: number
  total_applicable: number
  total_applicable_pass: number
  total_applicable_fail?: number
  applicability?: string[]
  requirements: ValidationRequirement[]
}

export interface ValidationResult {
  title: string
  name?: string
  date: string
  filename: string
  status: boolean
  status_text?: string
  specifications: ValidationSpecification[]
  total_specifications: number
  total_specifications_pass: number
  total_specifications_fail?: number
  percent_specifications_pass: number
  total_requirements: number
  total_requirements_pass: number
  total_requirements_fail?: number
  percent_requirements_pass: number
  total_checks: number
  total_checks_pass: number
  total_checks_fail?: number
  percent_checks_pass: number
  total_applicable?: number
  total_applicable_pass?: number
  total_applicable_fail?: number
  language_code?: string
  _lang?: string
  ui_language?: string
  available_languages?: string[]
  html_content?: string
  t?: Record<string, string>
  ids_filename?: string
  bcf_data?: {
    zip_content: string
    filename: string
  }
}
