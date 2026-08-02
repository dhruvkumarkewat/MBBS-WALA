import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export function Field({ label, hint, error, className = '', children }: FieldProps & { children: ReactNode }) {
  return (
    <label className={`ds-field ${className}`}>
      {label && <span className="ds-label">{label}</span>}
      {children}
      {error ? <span className="ds-error-text">{error}</span> : hint ? <span className="ds-help">{hint}</span> : null}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
}

export default function Input({ label, hint, error, icon, className = '', ...rest }: InputProps) {
  const input = (
    <input
      className={`ds-input ${error ? 'ds-input-error' : ''} ${className}`}
      aria-invalid={!!error}
      {...rest}
    />
  );

  return (
    <Field label={label} hint={hint} error={error}>
      {icon ? (
        <div className="ds-input-wrap">
          <span className="ds-input-icon">{icon}</span>
          {input}
        </div>
      ) : (
        input
      )}
    </Field>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, className = '', ...rest }: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      <textarea className={`ds-textarea ${error ? 'ds-input-error' : ''} ${className}`} aria-invalid={!!error} {...rest} />
    </Field>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, hint, error, options, className = '', ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      <select className={`ds-select ${className}`} aria-invalid={!!error} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}
