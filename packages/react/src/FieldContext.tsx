import React from 'react'

export type IFieldProviderProps = {
  basePath?: string
  children?: React.ReactNode | null | undefined
}
export const FieldContext = React.createContext<string | undefined>('')
export const FieldProvider: React.FC<IFieldProviderProps> = (props) => {
  return <FieldContext.Provider value={props.basePath}>{props.children}</FieldContext.Provider>
}
FieldProvider.displayName = 'FieldProvider'

export const useBasePath = () => {
  return React.useContext(FieldContext)
}
