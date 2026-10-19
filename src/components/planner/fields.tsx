/**
 * Form fields for the Plan my trip island. Same markup and classes as the Astro field
 * components (src/components/ui/form/, styled by field.css), so both look and behave alike:
 * visible label, hint, error message, aria-describedby and aria-invalid.
 */
import type { ReactNode } from 'react';
import { iconPaths, type IconName } from '../ui/icons';
import type { Option } from './planner-model';

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={['icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: iconPaths[name] }}
    />
  );
}

function aria(id: string, hint?: string, error?: string) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { hintId, errorId, describedBy, invalid: error ? true : undefined };
}

function Hint({ id, text }: { id: string | undefined; text: string | undefined }) {
  if (!id || !text) return null;
  return (
    <p id={id} className="field-msg field-hint">
      <span>{text}</span>
    </p>
  );
}

function ErrorLine({ id, text }: { id: string | undefined; text: string | undefined }) {
  if (!id || !text) return null;
  return (
    <p id={id} className="field-msg field-error">
      <Icon name="alert-circle" size={18} />
      <span>
        <span className="sr-only">Error: </span>
        {text}
      </span>
    </p>
  );
}

function Label({
  htmlFor,
  label,
  optional,
}: {
  htmlFor: string;
  label: string;
  optional: boolean | undefined;
}) {
  return (
    <label className="field-label" htmlFor={htmlFor}>
      {label}
      {optional && <span className="field-optional"> (optional)</span>}
    </label>
  );
}

interface TextProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
  optional?: boolean;
  type?: 'text' | 'tel' | 'email' | 'date';
  inputMode?: 'numeric' | 'tel' | 'email' | 'text';
  autoComplete?: string;
  maxLength?: number;
  multiline?: boolean;
  half?: boolean;
}

export function TextField(props: TextProps) {
  const {
    id,
    label,
    value,
    onChange,
    hint,
    error,
    optional,
    type = 'text',
    multiline,
    half,
  } = props;
  const a = aria(id, hint, error);
  const shared = {
    id,
    name: id,
    className: multiline ? 'field-control field-textarea' : 'field-control',
    value,
    required: !optional,
    'aria-describedby': a.describedBy,
    'aria-invalid': a.invalid,
    maxLength: props.maxLength,
  };
  return (
    <div className={['field', half && 'field-half'].filter(Boolean).join(' ')}>
      <Label htmlFor={id} label={label} optional={optional} />
      <Hint id={a.hintId} text={hint} />
      {multiline ? (
        <textarea {...shared} rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input
          {...shared}
          type={type}
          inputMode={props.inputMode}
          autoComplete={props.autoComplete ?? 'off'}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <ErrorLine id={a.errorId} text={error} />
    </div>
  );
}

interface SelectProps {
  id: string;
  label: string;
  value: string;
  options: Option[];
  prompt: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
}

export function SelectField({
  id,
  label,
  value,
  options,
  prompt,
  onChange,
  hint,
  error,
}: SelectProps) {
  const a = aria(id, hint, error);
  return (
    <div className="field">
      <Label htmlFor={id} label={label} optional={false} />
      <Hint id={a.hintId} text={hint} />
      <div className="select-wrap">
        <select
          id={id}
          name={id}
          className="field-control field-select"
          value={value}
          required
          aria-describedby={a.describedBy}
          aria-invalid={a.invalid}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{prompt}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={20} className="select-chevron" />
      </div>
      <ErrorLine id={a.errorId} text={error} />
    </div>
  );
}

interface RadioProps {
  id: string;
  legend: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
}

export function RadioField({ id, legend, value, options, onChange, hint, error }: RadioProps) {
  const a = aria(id, hint, error);
  return (
    <fieldset
      className="radios"
      id={id}
      role="radiogroup"
      aria-labelledby={`${id}-legend`}
      aria-describedby={a.describedBy}
      aria-invalid={a.invalid}
      aria-required="true"
    >
      <legend className="radios-legend" id={`${id}-legend`}>
        {legend}
      </legend>
      <Hint id={a.hintId} text={hint} />
      <div className="radios-options">
        {options.map((option, index) => (
          <div className="radio-row" key={option.value}>
            <input
              className="radio-input"
              type="radio"
              id={`${id}-${index}`}
              name={id}
              value={option.value}
              checked={option.value === value}
              required
              onChange={() => onChange(option.value)}
            />
            <label className="radio-label" htmlFor={`${id}-${index}`}>
              {option.label}
            </label>
          </div>
        ))}
      </div>
      <ErrorLine id={a.errorId} text={error} />
    </fieldset>
  );
}

interface CheckboxProps {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean;
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  hint,
  error,
  required,
}: CheckboxProps) {
  const a = aria(id, hint, error);
  return (
    <div className="check">
      <div className="check-row">
        <input
          className="check-input"
          type="checkbox"
          id={id}
          name={id}
          checked={checked}
          required={required}
          aria-describedby={a.describedBy}
          aria-invalid={a.invalid}
          onChange={(event) => onChange(event.target.checked)}
        />
        <label className="check-label" htmlFor={id}>
          {label}
        </label>
      </div>
      {(hint || error) && (
        <div className="check-msgs">
          <Hint id={a.hintId} text={hint} />
          <ErrorLine id={a.errorId} text={error} />
        </div>
      )}
    </div>
  );
}

interface ChipsProps {
  id: string;
  label: string;
  options: Option[];
  values: string[];
  onToggle: (value: string) => void;
  hint?: string;
}

/** Toggle chips (aria-pressed), the same look as FilterChips.astro. */
export function ChipGroup({ id, label, options, values, onToggle, hint }: ChipsProps) {
  return (
    <div className="chips">
      <p id={`${id}-label`} className="chips-label">
        {label} <span className="field-optional">(optional)</span>
      </p>
      {hint && (
        <p id={`${id}-hint`} className="field-msg field-hint">
          <span>{hint}</span>
        </p>
      )}
      <div
        className="chips-list"
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        {options.map((option, index) => {
          const pressed = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              id={`${id}-${index}`}
              className="chip"
              aria-pressed={pressed}
              onClick={() => onToggle(option.value)}
            >
              <Icon name="check" size={16} className="chip-tick" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
