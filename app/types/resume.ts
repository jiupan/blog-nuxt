export type ResumeBasic = {
  name: string
  birth: string
  gender: string
  politicalStatus: string
  hometown: string
  phone: string
  email: string
  avatar: string
}

export type ResumeSectionItem = {
  id: string
  range: string
  heading: string
  badge: string
  direction: string
  secondary: string
  tag: string
  intro: string
  stack: string
  bullets: string
}

export type ResumeSectionType =
  | 'education'
  | 'skills'
  | 'project'
  | 'experience'
  | 'research'
  | 'campus'

export type ResumeSection = {
  id: string
  title: string
  type: ResumeSectionType
  items: ResumeSectionItem[]
}

export type ResumeContent = {
  basic: ResumeBasic
  sections: ResumeSection[]
}

export type ResumeTemplate = 'classic' | 'modern'

export type ResumeLayout = {
  template: ResumeTemplate
  sectionGap: number
  lineHeight: number
  pageMargin: number
  fontSize: number
}

export type ResumeDocument = {
  title: string
  content: ResumeContent
  layout: ResumeLayout
}

export type ResumeLibraryItem = {
  id: number
  title: string
  updatedAt: string
}
