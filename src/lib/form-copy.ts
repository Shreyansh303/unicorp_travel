/**
 * Copy shared by every form and the trip planner, so the purpose notice (F-14), the opt-in
 * and the success screen read the same everywhere. Kept apart from the field specs so the
 * React island can import it without them.
 */
export const formCopy = {
  noticeTitle: 'How we use these details',
  notice:
    'We use these details only to reply to this request. This website does not store them or send them anywhere: on the next screen you choose to send your request to us yourself, by WhatsApp or email.',
  /** The planner keeps its draft in session storage, so it cannot say "does not store". */
  plannerNotice:
    'We use these details only to reply to this request. Your answers are kept in this browser tab until you send them or close the tab. This website does not send them anywhere; you choose to send them by WhatsApp or email.',
  privacyLinkText: 'Read the privacy notice',
  optInLabel: 'Also send me occasional travel ideas and offers',
  optInHint: 'Optional. You can ask us to stop at any time.',
  optInSummaryLabel: 'Travel ideas and offers',
  successTitle: 'Your request is ready to send',
  successText:
    'Nothing has been sent yet, and this website keeps no copy. Choose how to send it to us: the message opens with your details filled in.',
  whatsappLabel: 'Send on WhatsApp',
  emailLabel: 'Email instead',
  editLabel: 'Change my answers',
} as const;
