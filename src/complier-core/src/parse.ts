import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);

  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any = [];

  let node;
  if (context.source.startsWith("{{")) {
    // 如果内容字符串以`{{`开头
    // 则
    node = parseInterpolation(context);
  }

  nodes.push(node);

  return nodes;
}

function parseInterpolation(context) {
  // {{message}},拿到message

  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  // 获取插值表达式闭合符号的索引位置
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );
  
  // '{{ message }}' => ' message }}'
  advanceBy(context, openDelimiter.length);

  // 获取插值表达式内容的长度（算空格符），'{{ message }}' => ' message ' => 9
  const rawContentLength = closeIndex - openDelimiter.length;

  // ' message }}' => ' message '
  const rawContent = context.source.slice(0, rawContentLength);
  // ' message ' => 'message'
  const content = rawContent.trim();

  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}

function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length);
}

function createRoot(children) {
  return {
    children,
  };
}

function createParserContext(content: string): any {
  return {
    source: content,
  };
}
