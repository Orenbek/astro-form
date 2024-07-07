# problems with Language Server and code transpilation
## 1. we only have one frontmatter, so we can't distinguish global statement and function statement. we need to do some magic to split it.
## 2. f.string tag dosn't do code compeletion.
## 3. our import statement regex can't match `import {} from 'xxx'` type of statement. currently it doesn't matter, only if occurs in the last line of import statement.
```ts
import importA from 'a';
import importB from 'b';
// this case transpilation will be broken.
import {} from 'c';
```
```ts
import importA from 'a';
// this case it's ok.
import {} from 'c';
import importB from 'b';
```
## 4. if astroform directives properties defined as shorthand property, then after it doesn't support code completion.
```tsx
// type after x:visible doesn't provide code completion.
<f.number x:visible onC></f.number>
// type before x:visible does provide code completion. work as expected.
<f.number onC x:visible></f.number>
```
## 5. autoformat doesn't work.
## 6. prettier doesn't work.