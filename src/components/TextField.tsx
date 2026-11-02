type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
};

export function TextField({ label, name, hint, id, ...props }: TextFieldProps) {
  const inputId = id ?? name;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className="border-line placeholder:text-muted focus:border-ink focus:ring-ink/10 rounded-ui h-11 w-full border bg-white px-3 text-sm transition-[border-color,box-shadow] outline-none focus:ring-4"
        {...props}
      />
      {hint && <p className="text-muted mt-1.5 text-xs">{hint}</p>}
    </div>
  );
}
