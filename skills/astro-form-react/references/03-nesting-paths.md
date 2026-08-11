# 03 — Nesting, paths, arrays

公开 API。Evidence: `Field.tsx`, `FieldContext.tsx`, core `Form`/`ArrayField`/`BaseField`, `shared/internals.ts`。

全局约定（`x-hidden` vs unmount destroy、form 稳定）见 **SKILL.md**；本文只讲路径与嵌套。

## 1. Path = basePath + name

```ts
FormPath.parse(basePath).concat(name) // e.g. user + name → "user.name"
```

- `basePath`：最近 `FieldProvider`（默认 `''`）
- `name`：单段或点号串（`address.city`、`0.title`）
- 同一 path 字符串 = `form.fields` 注册 key + `values` 取值地址

| 表达式 | 结果 |
|---|---|
| `parse('user').concat('name')` | `user.name` |
| `parse('').concat('address.city')` | `address.city` |
| `parse('list').concat('0')` | `list.0` |
| `parse('user.name').match('user.**')` | true |

## 2. FieldProvider / 继承

`FieldRender` 用字段自身 path 包 children → 嵌套自动拼路径，无需手写 basePath。

```jsx
<f.Object name="company">
  <f.Object name="address">
    <f.String name="city" as="input" />  {/* company.address.city */}
  </f.Object>
</f.Object>
```

仅分组、不要容器节点：

```jsx
<FieldProvider basePath="profile">
  <f.String name="nick" as="input" />  {/* profile.nick；无 profile 字段节点 */}
</FieldProvider>
```

**禁止** `basePath={undefined}` → `createFieldHelper` 返回 null，字段静默不注册。

### `x-basePath`

覆盖继承，只改注册路径不改 JSX 位置：

```jsx
function EmailInput({ path }: { path: string }) {
  return <f.String name="email" x-basePath={path} as="input" v-format="email" x-required />
}
// <EmailInput path="user.contact" /> → user.contact.email
```

`v-basePath` 无效（进 validator 桶）。

## 3. Object

```jsx
<f.Object name="user" as="fieldset">
  <f.String name="name" as="input" x-required />
  <f.Object name="address">
    <f.String name="city" as="input" />
    <f.String name="zip" as="input" v-pattern={/^\d{5}$/} />
  </f.Object>
</f.Object>
```

| 写法 | 有 `user` 字段节点 | 子树 display/pattern 级联 |
|---|---|---|
| `<f.Object name="user">`（可无 `as`） | 是 | 是 |
| `<FieldProvider basePath="user">` | 否 | 否（跟上级） |
| `<f.String name="address.city" />` | 无中间 `address` 节点 | 无 |

容器级联：父 `display`/`pattern` 影响后代；`'none'` 清空值，`'hidden'` 保留。整块隐藏：

```jsx
<f.Object name="billing" x-display={isGuest ? 'hidden' : 'visible'}>…</f.Object>
```

## 4. Array

静态：`name="0.title"`。动态：**禁止 render-prop children**。

```jsx
const Todos = observer(() => {
  const listRef = useRef() // @astro-form/react useRef = MobX box
  const list = listRef.get()?.value ?? []
  return (
    <f.Array name="todos" as="div" x-ref={listRef} x-initialValue={[{ title: 'a' }]}>
      {list.map((_, i) => (
        <div key={i}>
          <f.String name={`${i}.title`} as="input" x-required />
          <button type="button" onClick={() => listRef.get()?.remove(i)}>remove</button>
        </div>
      ))}
      <button type="button" onClick={() => listRef.get()?.push({ title: '' })}>add</button>
    </f.Array>
  )
})
```

- 首帧 box 未填 → `[]` 正常；别用本地 state「修」首帧。
- API：`push/pop/insert/remove/shift/unshift/move/moveUp/moveDown`（Promise）。
- 数组校验：`v-minItems` / `v-maxItems` / `v-uniqueItems`（不是 `x-*`）。

### 路径重写（模型层）

`remove/insert/move`：`destroy(false)` 拆实例（可不删数据树项）或 `__updateFieldPath` 平移。  
**React `key={i}` 必须与下标 path 对齐**；勿用稳定 id key 自行重排数组（会与 Field path 错位）。重排用 `move*`。

## 5. Register-only（无 `as`）

仍注册节点 + 提供 basePath；`FieldRender` 只输出 children（`display !== 'visible'` 时为 null）。

## 6. Path 身份与 React lifecycle

createField 按 path 缓存；React Field cleanup：`onUnmount` + **`destroy()`（默认清值）**。

| 场景 | 结果 |
|---|---|
| 重渲染、path 不变 | 复用同一 Field |
| 条件卸载再挂载 | destroy 后 **new** Field；值需 initial 再播种 |
| 改 `name`/`basePath` | 旧 path destroy + 新 path 创建 |
| 改 `as` | 不重建（只同步 componentProps） |
| 同 path 两处渲染 | 共享实例 → 反模式 |

保值显隐 → `x-hidden`；`{cond && <Field />}` → 丢值。StrictMode 双 effect 同 destroy/新建——form 必须稳定。

## 7. 查询

```ts
form.query('user.name').take()?.value
form.query('user.**').map()
form.setValuesIn('user.name', 'grace')
```

路径语法、`field.query` 相对定位、与 `useField` 的差异 → ref **07**。

## 8. 速查

1. 保值：`x-hidden`，勿条件卸载  
2. 数组：`observer` + box + 下标 name/`key={i}` + `move*`  
3. 不要 `FieldProvider basePath={undefined}`  
4. 点号 name 不建中间节点；要级联用 `f.Object`
