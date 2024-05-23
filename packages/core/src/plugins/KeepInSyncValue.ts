import { IReactionDisposer, reaction } from 'mobx'

import { Field } from '../models/Field'

import { FieldPlugin } from './type'

/** 解决 value 并没有被手动修改时(即触发 onInput 或者是 setValue)，修改 initialValue 需同步修改 value 的场景 */
export class KeepInSyncValue implements FieldPlugin {
  name = 'KeepInSyncValuePlugin'

  private field: Field<any, any>

  private syncedValue: any

  private valueUnchanged: boolean = true

  private disposers: IReactionDisposer[] = []

  constructor(field: Field) {
    this.field = field

    this.disposers.push(
      reaction(
        () => this.field.initialValue,
        (initialValue) => {
          /**
           * 这个地方写一点额外的 action 逻辑，写在这里是为了方便
           * 修改 initialValue 时需要根据当前 field 的状态决定要不要赋值给 value。
           * 由于用户可能会在 field.setInitialValue 中操作 也有可能在 form.setInitialValues, form.setInitialValuesIn
           * 中修改 initialValue，因此需要这些地方都做好处理。特别是 setInitialValues setInitialValuesIn 中得先 diff 出
           * 哪些部分有修改，然后遍历所有相关 field，太麻烦
           *
           * 若 field 没有值且没有被修改过，则修改 value 值
           * 这种处理方式下 初始化的时候这里会多触发一次
           */
          if (this.valueUnchanged && !field.selfModified && initialValue !== undefined) {
            field.setValue(initialValue)
            this.syncedValue = initialValue
          }
        }
      ),
      reaction(
        () => field.value,
        () => {
          if (field.value !== this.syncedValue) {
            this.valueUnchanged = false
          }
        }
      )
    )
  }

  destroy() {
    this.disposers.forEach((disposer) => disposer())
  }
}
