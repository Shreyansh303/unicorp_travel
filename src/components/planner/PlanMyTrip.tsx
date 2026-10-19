/**
 * "Plan my trip" guided request (F-13), a React island.
 *
 * Five steps (trip type, destinations, dates, travellers with budget and interests, contact and
 * consent), then a summary to check before sending. Each step is checked before Next moves on:
 * focus goes to the first problem, or to the new step's heading. Back keeps every answer. The
 * draft is kept in session storage so a refresh restores it, and cleared after a send.
 * Sending goes through submitEnquiry, like every other form; the success screen hands the
 * request to WhatsApp or email. Step changes slide and fade (transform and opacity only), and
 * not at all under reduced motion.
 */
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { animate } from 'motion/mini';
import { formCopy } from '../../lib/form-copy';
import { submitEnquiry, type EnquiryHandoff } from '../../lib/submit-enquiry';
import { messages } from '../../lib/validation';
import { ChipGroup, CheckboxField, Icon, RadioField, SelectField, TextField } from './fields';
import {
  answersByStep,
  clearDraft,
  flexibilityOptions,
  initialValues,
  lastStep,
  loadDraft,
  saveDraft,
  steps,
  summaryStep,
  toEnquiry,
  tripTypes,
  validateStep,
  type Errors,
  type FieldName,
  type Lists,
  type PlanValues,
} from './planner-model';
import '../ui/form/field.css';
import '../ui/button.css';
import '../ui/chips.css';
import '../ui/stepper.css';
import '../forms/forms.css';
import './planner.css';

interface Props extends Lists {
  privacyHref: string;
}

/** Id of the element that takes focus for a field with a problem. */
function focusId(name: FieldName): string {
  if (name === 'tripType' || name === 'flexibility') return `plan-${name}-0`;
  return `plan-${name}`;
}

const headingId = 'plan-step-title';

export default function PlanMyTrip({ regions, themes, budgets, privacyHref }: Props) {
  const lists: Lists = { regions, themes, budgets };
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<PlanValues>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<EnquiryHandoff | null>(null);
  const [restored, setRestored] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** Set when a step change should move focus and animate; not on first render or restore. */
  const moved = useRef<'forward' | 'back' | null>(null);
  const focusError = useRef<FieldName | null>(null);

  // Restore the draft once, on the first frame after hydration: the server renders the first
  // step, and session storage can only be read in the browser.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const draft = loadDraft();
      if (draft) {
        setValues(draft.values);
        setStep(draft.step);
      }
      setRestored(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Keep the draft in step with every change.
  useEffect(() => {
    if (restored && !sent) saveDraft({ step, values });
  }, [restored, sent, step, values]);

  // After a step change: move focus to the new heading and play the transition.
  useEffect(() => {
    const direction = moved.current;
    if (!direction) return;
    moved.current = null;
    headingRef.current?.focus();
    const panel = panelRef.current;
    if (panel && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      const offset = direction === 'forward' ? 24 : -24;
      // Duration and easing come from the motion tokens in tokens.css.
      const tokens = getComputedStyle(document.documentElement);
      const duration = parseFloat(tokens.getPropertyValue('--duration-base')) / 1000 || 0.24;
      const [x1 = 0.22, y1 = 1, x2 = 0.36, y2 = 1] = (
        tokens.getPropertyValue('--ease-out').match(/-?[\d.]+/g) ?? []
      ).map(Number);
      animate(
        panel,
        { opacity: [0, 1], transform: [`translateX(${offset}px)`, 'translateX(0px)'] },
        { duration, ease: [x1, y1, x2, y2] },
      );
    }
  }, [step, sent]);

  // After a failed check: move focus to the first problem.
  useEffect(() => {
    const name = focusError.current;
    if (!name) return;
    focusError.current = null;
    document.getElementById(focusId(name))?.focus();
  }, [errors]);

  function set<K extends FieldName>(name: K, value: PlanValues[K]): void {
    const next = { ...values, [name]: value };
    setValues(next);
    // Clear a problem as soon as it is fixed (the step's other problems stay).
    if (errors[name] || (name === 'regions' && errors.destinations)) {
      const remaining = validateStep(step, next);
      setErrors(
        (current) =>
          Object.fromEntries(
            Object.entries(current).filter(([key]) => remaining[key as FieldName]),
          ) as Errors,
      );
    }
  }

  function toggle(name: 'regions' | 'interests', value: string): void {
    const current = values[name];
    set(
      name,
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function goTo(next: number, direction: 'forward' | 'back'): void {
    moved.current = direction;
    setErrors({});
    setStep(next);
  }

  function next(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (step === summaryStep) {
      void send();
      return;
    }
    const problems = validateStep(step, values);
    const first = steps[step]?.fields.find((name) => problems[name]);
    if (first) {
      focusError.current = first;
      setErrors(problems);
      return;
    }
    goTo(step === lastStep ? summaryStep : step + 1, 'forward');
  }

  async function send(): Promise<void> {
    const result = await submitEnquiry(toEnquiry(values, lists, location.pathname));
    if (!result.ok) {
      // Contact details failed the final check: show them on the contact step.
      moved.current = 'back';
      setStep(lastStep);
      setErrors(result.errors);
      return;
    }
    clearDraft();
    moved.current = 'forward';
    setSent(result.handoff);
  }

  function startAgain(): void {
    clearDraft();
    setValues(initialValues);
    setErrors({});
    setSent(null);
    moved.current = 'back';
    setStep(0);
  }

  if (sent) {
    return (
      <div className="plan" data-planner data-planner-state="sent">
        <div className="plan-panel form-success" ref={panelRef}>
          <h2 id={headingId} className="t-h2 plan-title" tabIndex={-1} ref={headingRef}>
            Your trip request is ready to send
          </h2>
          <p className="form-success-text">{formCopy.successText}</p>
          <div className="form-success-actions">
            {sent.whatsapp && (
              <a
                className="btn btn-primary btn-lg"
                href={sent.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="whatsapp" />
                <span>{formCopy.whatsappLabel}</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            {sent.email && (
              <a className="btn btn-secondary btn-lg" href={sent.email}>
                <Icon name="mail" />
                <span>{formCopy.emailLabel}</span>
              </a>
            )}
          </div>
          <p className="plan-cleared">
            Your answers have been cleared from this browser.{' '}
            <button type="button" className="form-edit" onClick={startAgain}>
              Start a new request
            </button>
          </p>
        </div>
      </div>
    );
  }

  const info = steps[step];
  const groups = answersByStep(values, lists);

  return (
    <div className="plan" data-planner data-planner-step={step} data-ready={restored || undefined}>
      <nav className="stepper plan-stepper" aria-label="Progress">
        <ol className="stepper-list">
          {steps.map((item, index) => {
            const status = index < step ? 'done' : index === step ? 'current' : 'todo';
            return (
              <li
                key={item.label}
                className={`step step-${status}`}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <span className="step-marker" aria-hidden="true">
                  {status === 'done' ? <Icon name="check" size={18} /> : index + 1}
                </span>
                <span className="step-label">
                  {item.label}
                  {status === 'done' && <span className="sr-only"> (completed)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <form className="plan-form" noValidate onSubmit={next} aria-labelledby={headingId}>
        <div className="plan-panel" ref={panelRef}>
          <h2 id={headingId} className="t-h2 plan-title" tabIndex={-1} ref={headingRef}>
            <span className="plan-count">
              {info ? `Step ${step + 1} of ${steps.length}` : `All ${steps.length} steps done`}
            </span>
            <span>{info ? info.title : 'Check your request'}</span>
          </h2>

          {Object.keys(errors).length > 0 && (
            <p className="plan-error-note">
              {messages.summary(Object.keys(errors).length)} before you go on.
            </p>
          )}

          {step === 0 && (
            <RadioField
              id="plan-tripType"
              legend="Trip type"
              options={tripTypes}
              value={values.tripType}
              onChange={(value) => set('tripType', value)}
              error={errors.tripType}
            />
          )}

          {step === 1 && (
            <>
              <TextField
                id="plan-destinations"
                label="Places or ideas"
                hint="Anything helps: “Kerala”, “somewhere cool in May” or “beaches abroad”."
                value={values.destinations}
                onChange={(value) => set('destinations', value)}
                error={errors.destinations}
                optional
                multiline
                maxLength={500}
              />
              <ChipGroup
                id="plan-regions"
                label="Or pick regions"
                hint="Regions our sample holidays cover. Choose as many as you like."
                options={regions}
                values={values.regions}
                onToggle={(value) => toggle('regions', value)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <div className="plan-row">
                <TextField
                  id="plan-departDate"
                  label="Leaving on"
                  type="date"
                  value={values.departDate}
                  onChange={(value) => set('departDate', value)}
                  error={errors.departDate}
                  optional
                  half
                />
                <TextField
                  id="plan-returnDate"
                  label="Coming back"
                  type="date"
                  value={values.returnDate}
                  onChange={(value) => set('returnDate', value)}
                  error={errors.returnDate}
                  optional
                  half
                />
              </div>
              <TextField
                id="plan-timing"
                label="Or roughly when"
                hint="For example “the last week of December” or “10 days in May”."
                value={values.timing}
                onChange={(value) => set('timing', value)}
                optional
                maxLength={120}
              />
              <RadioField
                id="plan-flexibility"
                legend="How fixed are the dates?"
                options={flexibilityOptions}
                value={values.flexibility}
                onChange={(value) => set('flexibility', value)}
                error={errors.flexibility}
              />
            </>
          )}

          {step === 3 && (
            <>
              <div className="plan-row plan-row-3">
                <TextField
                  id="plan-adults"
                  label="Adults"
                  inputMode="numeric"
                  value={values.adults}
                  onChange={(value) => set('adults', value)}
                  error={errors.adults}
                  maxLength={2}
                />
                <TextField
                  id="plan-children"
                  label="Children"
                  hint="Under 12."
                  inputMode="numeric"
                  value={values.children}
                  onChange={(value) => set('children', value)}
                  error={errors.children}
                  optional
                  maxLength={2}
                />
                <TextField
                  id="plan-rooms"
                  label="Rooms"
                  inputMode="numeric"
                  value={values.rooms}
                  onChange={(value) => set('rooms', value)}
                  error={errors.rooms}
                  optional
                  maxLength={2}
                />
              </div>
              <SelectField
                id="plan-budget"
                label="Budget"
                prompt="Choose a budget"
                hint="A rough figure per person, without flights."
                options={budgets}
                value={values.budget}
                onChange={(value) => set('budget', value)}
                error={errors.budget}
              />
              <ChipGroup
                id="plan-interests"
                label="What do you enjoy?"
                options={themes}
                values={values.interests}
                onToggle={(value) => toggle('interests', value)}
              />
            </>
          )}

          {step === 4 && (
            <>
              <div className="plan-row">
                <TextField
                  id="plan-name"
                  label="Your name"
                  autoComplete="name"
                  value={values.name}
                  onChange={(value) => set('name', value)}
                  error={errors.name}
                  maxLength={80}
                  half
                />
                <TextField
                  id="plan-phone"
                  label="Phone number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  hint="A 10-digit mobile, or a landline with its STD code."
                  value={values.phone}
                  onChange={(value) => set('phone', value)}
                  error={errors.phone}
                  maxLength={20}
                  half
                />
              </div>
              <TextField
                id="plan-email"
                label="Email"
                type="email"
                autoComplete="email"
                hint="So we can send the plan in writing."
                value={values.email}
                onChange={(value) => set('email', value)}
                error={errors.email}
                optional
                maxLength={120}
              />
              <CheckboxField
                id="plan-consent"
                label="You may use these details to reply to my request and plan this trip"
                checked={values.consent}
                onChange={(value) => set('consent', value)}
                error={errors.consent}
                required
              />
              <CheckboxField
                id="plan-marketing"
                label={formCopy.optInLabel}
                hint={formCopy.optInHint}
                checked={values.marketing}
                onChange={(value) => set('marketing', value)}
              />
            </>
          )}

          {step === summaryStep && (
            <div className="plan-summary">
              <p className="t-muted">
                Check your answers. You can change any of them before you send.
              </p>
              {steps.map((item, index) => (
                <section
                  className="plan-summary-group"
                  key={item.label}
                  aria-labelledby={`plan-sum-${index}`}
                >
                  <div className="plan-summary-head">
                    <h3 id={`plan-sum-${index}`} className="t-h4">
                      {item.label}
                    </h3>
                    <button type="button" className="form-edit" onClick={() => goTo(index, 'back')}>
                      Change<span className="sr-only"> {item.label.toLowerCase()}</span>
                    </button>
                  </div>
                  <dl className="form-summary-list">
                    {(groups[index] ?? []).map((answer) => (
                      <div key={answer.label}>
                        <dt>{answer.label}</dt>
                        <dd>{answer.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="plan-actions">
          <div className="plan-buttons">
            {step > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => goTo(step === summaryStep ? lastStep : step - 1, 'back')}
              >
                <span>Back</span>
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={!restored}
              aria-describedby={step >= lastStep ? 'plan-notice' : undefined}
            >
              <span>
                {step === summaryStep
                  ? 'Send request'
                  : step === lastStep
                    ? 'Check my answers'
                    : 'Next'}
              </span>
              <Icon name="arrow-right" className="btn-icon-end" />
            </button>
          </div>
          {step >= lastStep && (
            <p className="form-notice" id="plan-notice">
              <strong>{formCopy.noticeTitle}.</strong> {formCopy.plannerNotice}{' '}
              <a href={privacyHref}>{formCopy.privacyLinkText}</a>.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
