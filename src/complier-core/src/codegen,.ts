import { NodeTypes } from "./ast";
import { helpersMapName, TO_DISPLAY_STRING } from "./runtimeHelpers";

export function generate(ast) {
  const context = createCodegenContext();
  const { push } = context;

  genFcuntionPreamble(ast, context);

  // 函数名
  const functionName = "render";
  // 函数参数
  const args = ["_ctx", "_cache"];
  const signature = args.join(", ");

  push(`function ${functionName}(${signature}) {`);
  push("return ");

  genNode(ast.codegenNode, context);

  push("}");

  return {
    code: context.code,
  };
}

function genFcuntionPreamble(ast: any, context) {
  const { push } = context;
  const VueBinging = "Vue";
  const aliasHelpers = (s) => `${helpersMapName[s]}: _${helpersMapName[s]}`;
  if (ast.helpers.length > 0) {
    push(
      `const { ${ast.helpers.map(aliasHelpers).join(", ")} } = ${VueBinging}`
    );
  }
  push(`\n`);
  push("return ");
}

function createCodegenContext() {
  const context = {
    code: "",
    push(source) {
      context.code += source;
    },
    helper(key) {
      return `_${helpersMapName[key]}`
    },
  };

  return context;
}

function genNode(node: any, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;

    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;

    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
  }
}
function genText(node: any, context: any) {
  const { push } = context;
  push(`'${node.content}'`);
}
function genInterpolation(node: any, context: any) {
  const { push, helper } = context;

  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context)
  push(`)`);
}
function genExpression(node: any, context: any) {
  const { push } = context;

  push(`${node.content}`);
}
