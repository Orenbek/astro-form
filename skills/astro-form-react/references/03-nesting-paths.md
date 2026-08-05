# Nesting, paths, arrays

> Topic: FieldProvider / basePath 继承、`x-basePath` 覆盖、Object/Array 嵌套模式、register-only 字段（无 `as`）、path 身份与 React remount 的关系。
> Evidence: `packages/react/src/Field.tsx`、`FieldContext.tsx`、`utils/extract-field-props.ts`、`hooks/*`、`packages/core/src/models/{Form,Field,BaseField,ArrayField,ObjectField}.ts`、`shared/internals.ts`（repo `main` @ 881a013）。本文只使用公开 API（`x-*` / `v-*` 与普通 React props）。

---

## 1. 路径模型：path = basePath + name

每个字段在表单里的地址是一个 **点号分隔的 path 字符串**，例如 `user.name`、`todos.0.title`。它同时是：

- `form.fields` 里 **Field 实例的注册 key**（`form.fields[pathString]`）；
- `form.values` / `form.initialValues` 数据树里的**取值地址**（`getValuesIn` / `setValuesIn` / `deleteValuesIn` 用同一个 path）。

字段的完整 path 由创建时的两个信息拼接而成（`packages/core/src/models/Form.ts` 的 `createField/createObjectField/createArrayField`）：

```ts
const path = FormPath.parse(props.basePath).concat(props.name)
```

- `basePath` 来自最近的 `FieldProvider`（缺省为 `''`，即根级）；
- `name` 是 `FieldProps.name: string`，可以是单段（`name="name"`）或**点号字符串**（`name="address.city"`，此时等同于两段嵌套）。

```jsx
<FormProvider form={form}>
  {/* 根级：basePath = '' → 注册为 "user" */}
  <f.Object name="user" as="fieldset">
    {/* 继承 basePath = "user" → 注册为 "user.name" */}
    <f.String name="name" as="input" x-required />
  </f.Object>
</FormProvider>
```

验证过的 path 行为（`@formily/path`）：

| 表达式 | 结果 |
|---|---|
| `FormPath.parse('user').concat('name')` | `"user.name"` |
| `FormPath.parse('').concat('address.city')` | `"address.city"`（点号 name 合法） |
| `FormPath.parse('list').concat('0')` | `"list.0"`（数组下标也是点号段） |
| `FormPath.parse('user.name').parent()` | `"user"` |
| `FormPath.parse('user.name').match('user.**')` | `true`（`**` 子树匹配） |

---

## 2. FieldProvider / basePath 继承

### 2.1 机制（内部，理解用）

`Field.tsx` 里 `FieldRender` 会把**每个字段自身的完整 path** 作为 `basePath` 包住自己的 children：

```tsx
// FieldRender（observer，内部实现）
return <FieldProvider basePath={props.path /* = ref.current.path.toString() */}>{children}</FieldProvider>
```

所以嵌套是**自动递归**的：任何 `f.*` 的 children 里的字段，basePath 都是父字段的 path。你不需要手工传 basePath——把字段放进另一个字段的 children 里，路径就自然拼出来了：

```jsx
<f.Object name="company">
  <f.Object name="address">
    <f.String name="city" as="input" />   {/* company.address.city */}
  </f.Object>
</f.Object>
```

### 2.2 根级默认 basePath = `''`

`FieldContext` 的默认值是 `''`（`FieldContext.tsx`：`React.createContext('')`），所以 `FormProvider` 直属的字段直接以 `name` 注册。**不要**显式渲染 `<FieldProvider basePath={undefined}>`——`createFieldHelper` 在 `basePath === undefined` 时直接返回 `null`，该字段不会注册（任何 `f.*` 都变成空渲染）。

### 2.3 直接使用 FieldProvider（不建容器字段）

`FieldProvider` 是公开导出，可以脱离字段单独设置一段子树的基础路径。适合“只想分组、不想要一个真实字段节点”的场景：

```jsx
import { FieldProvider, f } from '@astro-form/react'

<FieldProvider basePath="profile">
  <f.String name="nick" as="input" />    {/* profile.nick */}
  <f.String name="bio" as="textarea" />  {/* profile.bio */}
</FieldProvider>
```

注意：这样 `profile` **没有字段节点**，`form.query('profile').take()` 为 undefined；数据仍在 `form.values.profile`。若需要容器字段（子树 display/pattern 控制、整块 required、query 定位），用 register-only 的 `f.Object`（见 §4）。

---

## 3. `x-basePath` 覆盖继承的 basePath

`basePath` 是公开 field-model 属性（`x-basePath`）。`BaseField` 解析时优先取指令值，覆盖继承值：

```tsx
// Field.tsx（内部逻辑）
let basePath = useBasePath()
if (fieldProps.basePath !== undefined && fieldProps.basePath !== null) {
  basePath = String(fieldProps.basePath)   // 显式覆盖
}
```

用途示例——把一个字段“挂到”别的子树下（数据归属重定向），或者做复用组件（组件内部字段的落点由外部决定）：

```jsx
// 复用组件：数据落点由调用方指定
function EmailInput({ path }: { path: string }) {
  return <f.String name="email" x-basePath={path} as="input" v-format="email" x-required />
}

<f.Object name="user">
  <EmailInput path="user.contact" />   {/* → user.contact.email */}
</f.Object>
```

要点：

- `x-basePath` 只影响**注册路径**，不影响渲染位置（字段仍渲染在它所在的 JSX 位置）。
- 值会被 `String()` 化；点号字符串合法。
- `basePath` 属于 field-model 键，路由规则：`x-basePath` → 字段桶（不在 validator 集合里）；用 `v-basePath` 同样可行（`v-` 下若命中 field-model 集合也进字段桶）。
- **只认连字符 `x-basePath`**。运行时只切 `x-*` / `v-*` 前缀——`x:basePath` / `x:ref` 这类**冒号属性会落入 UI passthrough 桶，被模型静默忽略**（字段会注册到错误的路径，或盒子永不填充）。始终写连字符形式。

---

## 4. Object 嵌套模式

### 4.1 容器 + 叶子：`f.Object` 包 `f.String/f.Number/...`

```jsx
<f.Object name="user" as="fieldset">
  <legend>User</legend>
  <f.String name="name" as="input" x-required />
  <f.String name="email" as="input" v-format="email" />
  <f.Object name="address">
    <f.String name="city" as="input" />
    <f.String name="zip" as="input" v-pattern={/^\d{5}$/} />
  </f.Object>
</f.Object>
```

路径：`user.name`、`user.email`、`user.address.city`、`user.address.zip`。提交时 `form.submit()` 拿到的是完整的嵌套对象。

### 4.2 不带 `as` 的 `f.Object`（register-only 结构容器）

`f.Object` 不带 `as` 时**不渲染任何元素**，只注册字段节点 + 给 children 提供 basePath（见 §6）。最常用的“纯结构”写法：

```jsx
<f.Object name="user">
  <f.String name="name" as="input" />
</f.Object>
```

### 4.3 容器字段的子树语义（继承行为）

容器字段的 `display` / `pattern` 会**级联到后代**（`BaseField` getter）：

- `display`：父 `'none'` → 子树全部 `'none'`；父 `'hidden'` → 子树 `'hidden'`（除非子自设 `'none'`）。`'none'` 时字段值会被清空（`setDisplay` 内 `deleteValuesIn`），恢复时用 `initialValue` 回填。
- `pattern`：父 `'disabled'` → 子树全部禁用；父 `'readPretty'` → 子树只读（除非子自设 `'disabled'`）。

因此“整块隐藏/禁用/只读”只需要改容器字段：

```jsx
<f.Object name="billing" x-display={isGuest ? 'hidden' : 'visible'}>
  <f.String name="card" as="input" />
</f.Object>
```

容器字段也可以挂自己的校验（`x-required` 对对象做非空校验；对象还可配 `x-maxProperties` / `x-minProperties`）。

### 4.4 用点号 name 替代嵌套（快速写法）

不需要容器字段/子树语义时，可以少一层 JSX：

```jsx
<f.String name="address.city" as="input" />   {/* 等价于在 basePath="address" 下 name="city" */}
```

区别：`address` 没有字段节点——不能 `form.query('address').take()`，也没有 display/pattern 级联与整块校验。

---

## 5. Array 嵌套模式

### 5.1 静态下标

数组项字段的 name 用**下标字符串**（`name="0.title"`），路径形如 `todos.0.title`：

```jsx
<f.Array name="todos" as="div" x-initialValue={[{ title: 'a' }, { title: 'b' }]}>
  <div><f.String name="0.title" as="input" /></div>
  <div><f.String name="1.title" as="input" /></div>
</f.Array>
```

### 5.2 动态列表：observer + x-ref（推荐）

`children` 是普通 ReactNode，**不支持 render-prop（函数 children）**。动态列表要在 `observer` 组件里读取数组值并 `map` 出带下标 name 的字段：

```jsx
import { observer, f, useRef as useFieldRef } from '@astro-form/react'
// 注意：包导出的 useRef 不是 React 的 useRef！
// 它返回 MobX observable.box（x-ref 用的字段盒），用法是 box.get() / box.set()，没有 .current。

const Todos = observer(() => {
  const listRef = useFieldRef()                 // MobX box，初始 null
  const list = listRef.get()?.value ?? []     // box.get() → Field 模型；.value → 数组项（reactive）
  return (
    <f.Array name="todos" as="div" x-ref={listRef} x-initialValue={[{ title: 'a' }]}>
      {list.map((todo, i) => (
        <div key={i}>
          <f.String name={`${i}.title`} as="input" x-required />
          <button onClick={() => listRef.get()?.remove(i)}>remove</button>
        </div>
      ))}
      <button onClick={() => listRef.get()?.push({ title: '' })}>add</button>
    </f.Array>
  )
})
```

要点：

- `listRef` 是 `@astro-form/react` 导出的 `useRef`（`observable.box`），**不是** React ref。`x-ref` 在字段 mount 时把核心 `Field`（这里是 `ArrayField`）写进盒子；`observer` 会响应盒子与 `value` 变化，所以列表增删后自动重渲染。
- **首帧提示**：盒子在 mount effect（首次 commit 之后）里才被填充，observer 的第一次渲染读到 `null` → `[]` → 渲染 0 行，之后盒子填充、条目出现。这个一帧空渲染是正常现象，不要为了“修复”它引入本地 state。
- `ArrayField` 的方法（公开）：`push/pop/insert(index, ...items)/remove(index)/shift/unshift/move(from,to)/moveUp(i)/moveDown(i)`，全部返回 Promise。它们**同时改数据树与子字段路径**（见 §5.3）。
- 新项字段在下次渲染时按新下标自动注册；`remove` 会销毁对应下标子树里已注册的字段。
- 数组可配 `x-minItems` / `x-maxItems` / `x-uniqueItems`（validator 键）。

### 5.3 增删改时子字段路径的重写（模型层）

`ArrayField` 的 `remove/insert/move/...` 会先算 “node patches”（`shared/internals.ts` 的 `spliceArrayState` / `exchangeArrayState`），再对已注册的子字段做两种处理：

- **移除**：`fields[path]?.destroy(false)` —— `forceClear=false`，**不删数据值**，只销毁字段实例；
- **平移/交换**：`field.__updateFieldPath(newPath)` —— 字段**实例跟着数组项移动**（`form.fields` 的 key 同步改），保持字段状态（feedback、validator、selfModified 等）跟随该项。

所以对数组项执行 `remove(i)` 后，后续项字段的路径自动前移，不需要手动改 name。这是"下标即身份"的模型——**React key 必须与下标路径对齐**（见 §7）。

---

## 6. Register-only 字段（不带 `as`）

任何 `f.*` 都可以不传 `as`：

- **仍然注册字段节点**（`createFieldHelper` 不检查 `as`，`createField` 照常执行，`component: [undefined, props]`）；
- **渲染**：`FieldRender` 中 `props.as` 为空时，不创建元素，直接把 children 渲染出来（`display !== 'visible'` 时连 children 也不渲染）。

```jsx
// 纯结构容器：不产生 DOM 元素，只提供 path 作用域
<f.Object name="user">
  <f.String name="name" as="input" />
</f.Object>

// 等价于手写 FieldProvider
<FieldProvider basePath="user">
  <f.String name="name" as="input" />
</FieldProvider>
```

两种用法的区别：

| | `<f.Object name="user">`（register-only） | `<FieldProvider basePath="user">` |
|---|---|---|
| 字段节点 `user` | 有（可 query、可校验、可控制子树 display/pattern） | 无 |
| 数据落点 | `form.values.user.name` | `form.values.user.name`（相同） |
| 子树语义 | 继承自 `user` 字段 | 继承自最近的上级字段/表单 |

register-only 的容器字段还常用于“**一个 path 的字段，多块 UI 分散渲染**”场景：把容器字段挂在一个稳定的父组件上，各 UI 块用 `x-basePath` 挂进同一子树。容器字段的 `value`（对象/数组）默认值：`ObjectField` → `{}`，`ArrayField` → `[]`（无 value/initialValue 时）。

---

## 7. Path 身份与 React remounts（重点）

### 7.1 核心事实：Field 实例按 path 字符串缓存

`Form.createField/createObjectField/createArrayField`：

```ts
const identifier = path.toString()
if (!this.fields[identifier]) {
  new Field(path, props, this)        // 只有没注册过才创建
}
return this.fields[identifier]        // 否则复用已有实例
```

`BaseField` 的 mount effect 依赖是 form 实例、`basePath`、`name` 三者（源码内部记为 `[form, basePath, name]`）。由此得到身份规则：

| 场景 | 结果 |
|---|---|
| 父组件重渲染，`name`/`basePath` 不变 | effect 不重跑 → **复用同一个 Field 实例**（值、校验状态、feedback 全保留） |
| 同 path 卸载后重新挂载（如 tab 切换、条件渲染） | `createFieldHelper` 取回缓存实例，`mounted=false` 时重新 `onMount()` → **仍是同一个 Field** |
| `name` 或 `basePath` 运行时改变 | effect 清理旧字段（`onUnmount`，只置 `mounted=false`，**不销毁**），再在新 path 建新字段 |
| `as` 变化（input ↔ textarea 等） | **不重建字段**（`as` 不进 mount effect deps），只走 componentProps 同步，值保留 |
| 同一 path 同时在两处渲染 | 共享同一个 Field 实例（第二个挂载方拿到缓存实例）→ **反模式**，会互相覆盖 UI props |

### 7.2 运行时改 path：注意“幽灵字段”

`name`/`basePath` 变化时旧字段**不会**从 `form.fields` 删除（`onUnmount` ≠ `destroy`；`destroy` 只在表单卸载或数组增删时发生）。后果：

- `form.values` 里旧 path 的值仍然保留；`form.query(oldPath).take()` 仍能取到旧字段；
- 旧字段若带 validator，`form.validate()` / `form.submit()` 会**把旧字段也算进去**（`Query` 遍历 `form.fields`），可能报出“消失的字段”的错误。

**建议**：不要运行时改 `name` / `basePath`（改数据结构请用 `ArrayField` 的增删移动方法，或显式 `field.destroy()` + 新字段）。“让字段跟着数据走”时，路径重写是模型层负责的（§5.3），React 侧只改 name 的下标来源。

### 7.3 React key 与路径对齐

字段身份是 path 作用域的，数组项 name 又是下标字符串，所以：

- **`key` 用下标（`key={i}`），与 name 的 `${i}.*` 对齐**——增删/移动时 React 组件实例与 Field 实例按“位置=路径”一致，输入框 DOM 复用，焦点不丢；
- 若用**稳定 id 做 key 并自行重排数组**（不走 `ArrayField.move`），React 会按 id 移动 DOM，但字段路径仍按下标 → 组件与 Field 实例错位（DOM 里的输入框显示的数据与绑定的字段对不上）。此时应改为：用 `arrayField.move/moveUp/moveDown` 让模型层跟着重排路径，或者把重排实现成 remove + 重新插入。

结论一句话：**“路径即身份”的列表，React key 用下标、重排交给 ArrayField 的方法**。

### 7.4 表单实例：字段身份还挂在 Form 上

字段注册在 `form.fields` 里，path 身份是**相对某个 Form 实例**的。两个表单可以各自有 `user.name`。相关约定（完整讨论见 lifecycle 主题）：

- `createForm()` 应 `useMemo`/模块级稳定，不要每次 render 重建——否则 form 实例变化 → 所有字段 effect 重跑（`onUnmount` 旧表单 + 注册新表单）；
- `FormProvider` 在 form 变化时会触发旧表单 `onUnmount`（`Form.onUnmount` 会 `destroy` 全部字段）与新表单 `onMount`。

### 7.5 StrictMode（dev 双调用）

StrictMode 下 effect 双跑：创建字段 → `onUnmount` → 再次 `createFieldHelper`（命中缓存、`mounted=false` → 重新 `onMount`）。因为实例被缓存且 `onMount/onUnmount` 幂等（只改 `mounted` 标志 + 发事件），**不会重复注册或丢状态**；`componentProps` 在创建时（render 阶段）已带最新 props，双跑后 UI props 仍是新的。

---

## 8. 常用查询/取值（nested paths）

```tsx
import { createForm } from '@astro-form/core'

const form = createForm({ initialValues: { user: { name: 'ada' } } })

form.query('user').take()                    // ObjectField | undefined
form.query('user.name').take()?.value        // 'ada'
form.query('todos.0.title').take()
form.query('user.**').map()                  // user 子树所有字段
form.values.user.name                        // 直接读数据树
form.setValuesIn('user.name', 'grace')       // 写数据树（等价 field.value = ...）
form.deleteValuesIn('user.address')          // 删除一段
```

---

## 9. Pitfalls 速查

1. 运行时改 `name`/`basePath` → 旧字段成为幽灵（值残留、可能参与校验）。不要这么做。
2. `f.*` 不带 `as` 就是 register-only：不渲染元素。想要元素就传 `as`（或自己包 DOM）。
3. 动态数组不要用 render-prop children；用 `observer` + `x-ref`（包的 `useRef`）读 `ArrayField.value`。
4. 同一 path 渲染两处 = 共享一个 Field 实例，互相覆盖 → 反模式。
5. 数组重排：`ArrayField.move/moveUp/moveDown` 会同步重写字段路径；React key 用下标。别用 id key 自行重排。
6. `<FieldProvider basePath={undefined}>` 会让子树里的字段全部静默不注册。
7. 点号 name（`name="a.b"`）合法但**不创建中间字段节点**——需要容器语义（级联、整块校验、query 定位）时用 `f.Object`/register-only 容器。
8. 容器 `display='none'` 会清空子树值（恢复时按 initialValue 回填）；隐藏字段请不要依赖用户输入保留。

---

## 10. Open questions

- **幽灵字段的精确清理时机**：运行时改 path 后，旧字段留在 `form.fields` 且 `mounted=false`。已确认它不参与 `field.destroy()` 自动清理（仅表单卸载/数组操作触发）；但“`form.validate('*')` 是否必然把幽灵字段纳入校验”依赖 `Query` 对 `form.fields` 的全量遍历，若后续实现改为只遍历 `mounted` 字段，此行为会变——建议在 lifecycle 主题中再核对一次。
- **`ArrayField.insert` 中间插入时 React 侧的一帧窗口**：模型层先重写路径、值后 `onInput`，二者在同一 `runInAction` 内，React 只会看到最终一致的状态；但若组件在 patch 后立刻读 `listRef.get().value` 并据此生成 name，理论上与已重写路径同帧一致（已验证逻辑，未做真实 DOM 时序测试）。
- **`x-basePath` 用 `null` 值的语义**：代码里 `null` 视为“未设置”走继承，`undefined` 也是；但 `x-basePath=""`（空串）会显式把字段挂到根级。这与“缺省=根级”行为一致，未发现额外分支。
