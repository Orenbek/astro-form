import type {
  AttributeNode,
  CommentNode,
  ComponentNode,
  CustomElementNode,
  DoctypeNode,
  ElementNode,
  ExpressionNode,
  FragmentNode,
  FrontmatterNode,
  Node,
  ParentLikeNode,
  RootNode,
  TagLikeNode,
  TextNode,
  ValueNode,
} from '@astro-form/compiler'

interface GlobalExpressionNode extends ValueNode {
  type: 'global-expression'
}

export type anyNode =
  | RootNode
  | AttributeNode
  | ElementNode
  | ComponentNode
  | CustomElementNode
  | ExpressionNode
  | TextNode
  | DoctypeNode
  | CommentNode
  | FragmentNode
  | FrontmatterNode
  | GlobalExpressionNode

export type {
  AttributeNode,
  CommentNode,
  ComponentNode,
  CustomElementNode,
  DoctypeNode,
  ElementNode,
  ExpressionNode,
  FragmentNode,
  FrontmatterNode,
  Node,
  ParentLikeNode,
  RootNode,
  TagLikeNode,
  TextNode,
  GlobalExpressionNode,
}
