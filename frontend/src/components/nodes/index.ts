import WorkflowNode from "./WorkflowNode";
import BlankBoxNode from "./BlankBoxNode";
import TextNode from "./TextNode";
import ConditionNode from "./ConditionNode";

export const nodeTypes = {
  startNode: WorkflowNode,
  agentNode: WorkflowNode,
  toolNode: WorkflowNode,
  finishNode: WorkflowNode,
  conditionNode: ConditionNode,
  blankBoxNode: BlankBoxNode,
  textNode: TextNode,
};

export { WorkflowNode, BlankBoxNode, TextNode, ConditionNode };
