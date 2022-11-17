import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

export function baseParse(content: string) {
  const context = createParserContext(content);

  return createRoot(parseChildren(context, []));
}

function parseChildren(context, ancestors) {
  const nodes: any = [];

  while (!isEnd(context, ancestors)) {
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
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }

    nodes.push(node);
  }

  return nodes;
}

function isEnd(context, ancestors) {
  const s = context.source;
  // 2. 当遇到结束标签的时候
  if (s.startsWith("</")) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const tag = ancestors[i].tag;

      if (startsWithEndTagOpen(s, tag))  {
        return true;
      }
      
    }
  }
  // if (parentTag && s.startsWith(`</${parentTag}>`)) {
  //   return true;
  // }

  // 1. source 有值的时候
  return !s;
}

function parseText(context: any) {
  let endIndex = context.source.length;
  let endTokens = ["<", "{{"];

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  // 1. 获取content
  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseTextData(context: any, length) {
  const content = context.source.slice(0, length);

  // 2. 推进
  advanceBy(context, length);
  return content;
}

function parseElement(context: any, ancestors) {
  // 1. 解析 tag
  const element: any = parseTag(context, TagType.Start);
  ancestors.push(element)
  element.children = parseChildren(context, ancestors);
  ancestors.pop()

  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  } else {
    throw new Error(`缺少结束标签：${element.tag}`);
  }

  return element;
}

function startsWithEndTagOpen(source: string, tag) {
  return source.startsWith("</") && source.slice(2, 2 + tag.length).toLocaleLowerCase() === tag;
}

function parseTag(context: any, type: TagType) {
  // <div></div>
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
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

  // 最后在让代码前进2个长度，可以把 }} 干掉
  advanceBy(context, closeDelimiter.length);

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
