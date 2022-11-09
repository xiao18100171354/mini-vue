import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  const context = createParserContext(content);

  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any = [];

  let node;

  const s = context.source;
  if (s.startsWith("{{")) {
    // 如果内容字符串以`{{`开头
    // 则进行解析插值表达式
    node = parseInterpolation(context);
  } else if (s[0] === "<") {
    // 如果内容以`<`开头
    if (/[a-z]/i.test(s[1])) {
      // 并且第一个字符是在 a-z 之间，那么我们就认为是 element 类型
      node = parseElement(context);
    }
  }

  if (!node) {
    node = parseText(context);
  }

  nodes.push(node);

  return nodes;
}

function parseText(context: any) {
  // 1. 获取content
  const content = parseTextData(context, context.source.length);

  console.log("context.source", context.source)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}

function parseTextData(context: any, length) {
  const content = context.source.slice(0, length);

  // 2. 推进
  advanceBy(context, length);
  return content;
}

function parseElement(context) {
  // 1. 解析 tag
  const element = parseTag(context, TagType.Start);

  parseTag(context, TagType.End);

  return element;
}

function parseTag(context: any, type: TagType) {
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  console.log(match);
  const tag = match[1];

  // 2. 删除处理完成后的代码
  advanceBy(context, match[0].length);
  advanceBy(context, 1);

  if (type === TagType.End) return;

  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
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
  const rawContent = parseTextData(context, rawContentLength);
  // ' message ' => 'message'
  const content = rawContent.trim();

  // advanceBy(context, rawContentLength + closeDelimiter.length);

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
