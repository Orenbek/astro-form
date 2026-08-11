# 07 — Path 与 Query

路径身份、Formily `FormPath` 语法、`form.query` / `field.query` / React 读取姿势。

Evidence: `@formily/path`（core 再导出为 `FormPath`）、`packages/core/src/models/Query.ts`、`Form.ts`、`BaseField.ts`、`packages/react/src/hooks/useField.ts`。  
路径如何拼进 JSX → ref **03**；读到 Field 后如何订阅 → ref **04**。

上游语法参考：[Formily FormPath](https://core.formilyjs.org/zh-CN/api/entry/form-path)。

---

## 1. Path 是什么

- 点分字符串：`user.address.city`、`todos.0.title`
- 同时是：`form.fields` 的 key、Field 的 `field.path`、values 树上的地址
- 创建：`FormPath.parse(basePath).concat(name)`（与 React `basePath` + `name` 一致）

```ts
form.fields['user.email']           // 精确键
form.getValuesIn('user.email')      // 值树（不必有 Field 节点）
form.query('user.email').take()     // 已注册的 Field 模型
```

未注册中间节点时，values 仍可有嵌套对象；`query` 只命中 **已 `createField` / `f.*` 挂上的** 字段。

---

## 2. FormPath 语法（@formily/path）

core：`import { FormPath } from '@astro-form/core'`（即 `@formily/path` 的 `Path`）。

### 2.1 精确路径

无通配：`user`、`user.email`、`todos.0.title`。

`Query` 走 `form.fields[identifier]` 精确取，不扫全表。

### 2.2 相对路径（第二个参数 base）

`FormPath.parse(pattern, base)`。`field.query` 的 base 是 `field.path`；`form.query` 的 base 是 `''`。

以 base = `user.address.city` 为例：

| pattern | 解析结果 | 含义 |
|---|---|---|
| `.` | `user.address` | 去掉最后一段（「当前」的父级容器路径） |
| `..` | `user` | 再上一级 |
| `...` | `''` | 到根 |
| `.street` | `user.address.street` | 相对「当前节点」接子段（同级兄弟/子路径） |
| `..zip` | `user.zip` | 上一级再接 `zip` |
| `...name` | `name` | 回到根附近再接 |
| `.0` | `user.address.0` | 数组下标同样适用 |
| `email` | `email` | **无前导 `.` → 绝对路径**，与 base 无关 |
| `user.email` | `user.email` | 绝对 |

记忆：

- 要相对定位 → 用 `.` / `..` 开头  
- 不写点 → 整段按**从根起的绝对 path** 解析（在 `field.query` 里也一样）

### 2.3 匹配模式（通配）

解析后 `isMatchPattern === true` 时，`Query` 遍历 `form.fields`，用 `field.match(pattern)` 过滤。

常见写法：

| pattern | 作用（结合测试与 Formily 语义） |
|---|---|
| `*` | 一层通配；实际匹配以 Formily 规则为准（中间未注册段可能被「跨过」，见下） |
| `**` | 深层通配 |
| `user.*` / `user.**` | 限制在 `user` 子树 |
| `*(a,b)` | 匹配名为 `a` 或 `b` 的一段 |
| `array.*.aa` | 生命周期订阅等也可用同类 pattern |

示例（仅注册了 `object`、`object.void.normal`、`array`，**没有** `object.void` 字段时）：

```ts
form.query('object.*').map(f => f.path.toString())
// → ['object.void.normal']   // * 可跨过未注册的中间段
form.query('object.**').map(...)
// → ['object', 'object.void.normal']
form.query('*').map(...)
// → 全部已注册字段
```

未注册的路径（如只有 `basePath: 'object.void'` 的叶子、中间 void 未建 Field）**不会**出现在 `query` 结果里，但叶子仍可用绝对 path 精确取到。

---

## 3. Query 对象

```ts
// form：base = ''
form.query(pattern): Query

// field（BaseField）：base = this.path
field.query(pattern): Query
```

| 方法 | 行为 |
|---|---|
| `take()` | 第一个命中的 `GeneralField`，没有则 `undefined` |
| `take(fn)` | 对第一个命中调用 `fn(field, path)` |
| `map()` / `map(fn)` | 全部命中 |
| `forEach(fn)` | 遍历 |
| `reduce(fn, init)` | 归约 |
| `getIn(sub)` | `FormPath.getIn(take(), sub)` — 从**字段对象**上取属性，不是 values 树 |

```ts
form.query('array').take()!.value
form.query('array').getIn('inputValue')
form.query('user.**').forEach((field) => { /* ... */ })
```

---

## 4. 两种 query 入口

```ts
// Form — 绝对 / 通配
form.query('user.email').take()
form.query('todos.*.title').map()

// Field — 同一套 FormPath，base = 当前 field.path
passwordField.query('.confirm').take()  // 兄弟 confirm
itemField.query('..').take()            // 父（如数组项的父 ArrayField）
emailField.query('user.phone').take()   // 仍是绝对 path（无前导 .）
```

实现对照：

```ts
// Form
new Query({ pattern, base: '', form: this })

// BaseField
new Query({ pattern, base: this.path, form: this.form })
```

**reactions / effects** 里已有 `field` 时，相对查兄弟/父级用 `field.query('.x')` / `field.query('..')`，避免手写完整 path。

内部已用 field 侧 query，例如子树：`` field.query(`${field.path}.**`) ``（绝对 match 串 + field 的 base 解析，最终仍是精确/通配 path）。

---

## 5. React 侧读取姿势

| API | 路径语义 | 典型用途 |
|---|---|---|
| `useField()` | 当前 `FieldProvider` 的 `basePath`（根 `''` → `undefined`） | 容器字段自身 |
| `useField(path)` | `FormPath.parse(basePath).concat(path)`，**始终当子 name 拼接** | 同树下按 name 取叶子 |
| `useForm().query(p)` | FormPath，base `''` | 绝对、通配、任意代码路径 |
| `useField()?.query(p)` / `box.get()?.query(p)` | Field 相对 FormPath（`.`, `..`） | 已有 Field 再相对查 |
| `x-ref` + package `useRef` | 不靠 path | 列表 host、跨树 box（首帧可能 null） |

`useField` **不是** Formily 相对语法：

```ts
// basePath = profile
useField('nick')           // → profile.nick   （concat）
field.query('nick')        // → nick           （绝对！）
field.query('.nick')       // → profile.nick   （相对）
```

需要 `.` / `..` 时：先拿到 Field，再 `field.query(...)`。

```tsx
// reactions
x-reactions={(field) => {
  const pwd = field.query('.password').take()
  // ...
}}

// React
const profile = useField()                 // profile
const nick = useField('nick')              // profile.nick
const form = useForm()
const allTitles = form.query('todos.*.title').map((f) => f.value)
```

读 observable 属性（`value` / `selfErrors` 等）仍要包 `observer`（ref 04）。

---

## 6. 查询 vs 读写 values

| 目标 | API |
|---|---|
| Field 模型 | `query` / `useField` / `x-ref` |
| 值（可不存在 Field） | `form.getValuesIn` / `setValuesIn` / `deleteValuesIn` / `existValuesIn` |
| 整表快照 | `mobx.toJS(form.values)` |

`form.query('a.b').take()` 为 `undefined` 只表示**没有该 Field**；`getValuesIn('a.b')` 仍可能有值。

---

## 7. 常用姿势

**精确一个字段**

```ts
form.query('email').take()
useField('email')                    // 在对应 basePath 上下文
```

**相对兄弟（effects / reactions）**

```ts
field.query('.confirmPassword').take()
field.query('..').take()             // 父字段
```

**数组一行内**

```ts
// 当前在 todos.0.title
field.query('..done').take()         // → todos.0.done
field.query('..').take()             // → todos.0（若该项有 Object 节点）或按实际注册 path
```

下标 path 与 `f.Array` 的 `name={\`${i}.title\`}` 一致时，相对段用 `.0` / `..1` 等与 FormPath 规则相同。

**子树批量**

```ts
form.query('user.**').forEach((f) => f.setDisplay('hidden'))
form.clearErrors('billing.*')
form.validate('todos.*.title')
```

**生命周期按 path 订阅**（form effects）

```ts
form.on(LifeCycles.ON_FIELD_VALUE_CHANGE, 'array.*.aa', (field, form) => { /* ... */ })
```

---

## 8. 易混点

| 情况 | 说明 |
|---|---|
| `field.query('x')` 找不到兄弟 | 缺前导 `.`，被当成根上的 `x` |
| `useField` 与 `field.query` 相对规则不同 | 前者 concat 子 name；后者 FormPath（要相对用 `.`） |
| `query` 空、values 有值 | 中间/叶子未注册 Field，或 path 写错 |
| 通配结果顺序 | 依赖 `Object.entries(form.fields)`，不要当稳定排序 |
| 已 destroy 的字段 | 不在 `fields` 里；旧 box 可能仍握着实例 → 看 `destroyed` |
| `getIn` on Query | 取的是 Field 实例属性，不是 `form.values` |

---

## 9. 速查

```ts
// 注册 path
FormPath.parse(basePath).concat(name)

// 绝对
form.query('user.email').take()

// 相对（从 field）
field.query('.sibling').take()
field.query('..').take()

// 通配
form.query('todos.*.title').map()
form.query('user.**').forEach(...)

// React
useField() / useField('childName')
useForm().query('...')
```
