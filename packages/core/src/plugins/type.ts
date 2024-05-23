import type { Field } from '../models/Field'

export abstract class FieldPlugin {
  abstract name: string

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(field: Field) {}

  abstract destroy(): void
}
