/** Küçük, erişilebilir arayüz bileşenleri. */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { readableTextOn } from '../lib/colors';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Panel({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'aside';
}) {
  return <Tag className={cx('card p-5 sm:p-6', className)}>{children}</Tag>;
}

export function PanelHeader({
  step,
  title,
  hint,
  action,
}: {
  step?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-baseline gap-3">
        {step && (
          <span className="font-mono text-[11px] font-medium tabular-nums text-lavender">{step}</span>
        )}
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{hint}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

export function Field({
  htmlFor,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cx('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-bold text-ink">
          {label}
          {optional && (
            <span className="ml-1.5 font-medium text-ink-soft">{t('(isteğe bağlı)', '(optional)')}</span>
          )}
        </label>
        {hint && !error && (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/80">{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-[12.5px] font-medium text-red-600"
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const inputBase =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-[14px] text-ink shadow-[inset_0_1px_0_rgba(37,35,56,0.02)] transition placeholder:text-ink-soft/55 focus:outline-none focus-visible:ring-4';

export function TextInput({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(
        inputBase,
        invalid
          ? 'border-red-300 focus:border-red-400 focus-visible:ring-red-100'
          : 'border-line focus:border-lavender focus-visible:ring-lavender/15',
        className,
      )}
    />
  );
}

export function TextArea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cx(
        inputBase,
        'resize-y leading-relaxed',
        invalid
          ? 'border-red-300 focus:border-red-400 focus-visible:ring-red-100'
          : 'border-line focus:border-lavender focus-visible:ring-lavender/15',
        className,
      )}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        inputBase,
        'appearance-none border-line bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23252338%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10 focus:border-lavender focus-visible:ring-lavender/15',
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-bold text-ink">
          {label}
        </label>
        <span className="font-mono text-[11px] tabular-nums text-ink-soft">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range w-full"
      />
      {hint && <p className="text-[12px] leading-snug text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Switch({
  id,
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="space-y-0.5">
        <label htmlFor={id} className="block text-[13px] font-bold text-ink">
          {label}
        </label>
        {hint && <span className="block max-w-[42ch] text-[12px] leading-snug text-ink-soft">{hint}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender/20 disabled:opacity-50',
          checked ? 'border-lavender bg-lavender' : 'border-line bg-canvas',
        )}
      >
        <span
          className={cx(
            'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(37,35,56,0.3)] transition-[left] duration-200',
            checked ? 'left-[23px]' : 'left-[3px]',
          )}
        />
      </button>
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-ink text-white hover:bg-[#312E4A] focus-visible:ring-ink/20',
    accent: 'bg-lavender text-white hover:bg-lavender-deep focus-visible:ring-lavender/25',
    secondary:
      'border border-line bg-white text-ink hover:border-lavender/50 hover:text-lavender-deep focus-visible:ring-lavender/20',
    ghost: 'text-ink-soft hover:bg-lilac-soft hover:text-ink focus-visible:ring-lavender/20',
  };
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-4',
        size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-4 py-2.5 text-[13.5px]',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SwatchButton({
  color,
  name,
  selected,
  onSelect,
  className,
}: {
  color: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${name} — ${color}`}
      title={`${name} — ${color}`}
      className={cx(
        'grid h-8 w-8 place-items-center rounded-lg border transition',
        selected
          ? 'border-lavender ring-2 ring-lavender/30'
          : 'border-line hover:border-lavender/50 hover:scale-105',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {selected && <Check size={14} strokeWidth={3} style={{ color: readableTextOn(color) }} aria-hidden />}
    </button>
  );
}

export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  subtitle,
  children,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cx(
        'has-focus-ring group relative flex cursor-pointer flex-col gap-2.5 rounded-2xl border p-3 transition',
        checked
          ? 'border-lavender bg-lilac-soft ring-2 ring-lavender/20'
          : 'border-line bg-white hover:border-lavender/45 hover:bg-lilac-soft/40',
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {children}
      <span className="pr-4">
        <span className="block text-[13px] font-bold leading-tight text-ink">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">{subtitle}</span>}
      </span>
      {checked && (
        <Check
          size={14}
          strokeWidth={3}
          className="absolute right-2.5 top-2.5 text-lavender"
          aria-hidden
        />
      )}
    </label>
  );
}

export function Callout({
  tone = 'info',
  icon,
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'mint';
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: 'border-line bg-canvas text-ink-soft',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    mint: 'border-mint bg-mint/30 text-[#1c6353]',
  } as const;
  return (
    <div className={cx('flex items-start gap-2.5 rounded-xl border px-3.5 py-3', tones[tone])}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="text-[12.5px] leading-relaxed">
        {title && <p className="font-bold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
