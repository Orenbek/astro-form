import React from 'react'
import type { IObservableValue } from 'mobx'

export function passRefToChild(node: React.ReactNode | undefined, ref: IObservableValue<any>) {
  if (Array.isArray(node)) {
    let newNode: React.ReactNode | undefined
    if (React.isValidElement(node[0])) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      newNode = React.cloneElement(node[0], { ...node[0]?.props, 'x-ref': getRef(node[0], ref) })
    }
    return node.map((it, index) => (index === 0 ? newNode || it : it))
  }
  if (React.isValidElement(node)) {
    return React.cloneElement(node, { ...node.props, 'x-ref': getRef(node, ref) })
  }
  return node
}

function getRef(node: React.ReactElement, ref: IObservableValue<any>) {
  if (!node.props['x-ref']) {
    return ref
  }
  if (Array.isArray(node.props['x-ref'])) {
    return [...node.props['x-ref'], ref]
  }
  return [node.props['x-ref'], ref]
}
