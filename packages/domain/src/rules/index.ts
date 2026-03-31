export {
  // Core evaluation
  evaluateCondition,
  evaluateRule,
  executeActions,
  matchRules,
  dryRun,

  // Built-in templates
  RULE_TEMPLATES,

  // Types
  type ConditionOperator,
  type RuleCondition,
  type ConditionLogic,
  type ActionType,
  type RuleAction,
  type AutomationRule,
  type ActionResult,
  type MatchResult,
  type DryRunRuleResult,
  type DryRunResult,
} from './engine.js';
