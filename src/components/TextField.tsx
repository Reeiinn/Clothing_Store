type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
};

export function TextField({ label, name, hint, id, ...props }: TextFieldProps) {
  const inputId = id ?? name;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className="border-line placeholder:text-muted focus:border-ink h-11 w-full border bg-white px-3 text-sm outline-none"
        {...props}
      />
      {hint && <p className="text-muted mt-1.5 text-xs">{hint}</p>}
    </div>
  );
}
