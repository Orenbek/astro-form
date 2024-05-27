import React from 'react'
import { Form } from '@astro-form/core'

export type IProviderProps = {
  form: Form
  children?: React.ReactNode | null | undefined
}
export const FormContext = React.createContext<Form>(null as any)
export const FormProvider: React.FC<IProviderProps> = (props) => {
  React.useEffect(() => {
    props.form.onMount()
    return () => props.form.onUnmount()
  }, [props.form])
  return <FormContext.Provider value={props.form}>{props.children}</FormContext.Provider>
}
FormProvider.displayName = 'FormProvider'

export const useForm = <T extends object = any>(): Form<T> => {
  return React.useContext(FormContext)
}
