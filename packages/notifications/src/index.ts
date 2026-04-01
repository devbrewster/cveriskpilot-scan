// @cveriskpilot/notifications — barrel exports
export { sendEmail } from './email/sender';
export {
  caseAssignedTemplate,
  commentMentionTemplate,
  slaBreachTemplate,
  digestTemplate,
  welcomeTemplate,
  trialExpiryTemplate,
  paymentFailedTemplate,
  usageLimitTemplate,
  trialExpiredTemplate,
} from './email/templates';
