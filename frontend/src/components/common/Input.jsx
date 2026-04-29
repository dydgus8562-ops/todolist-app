export function Input({ label, type = 'text', placeholder, value, onChange, error, required = false, id }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {required ? `${label} *` : label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-1 ${
          error
            ? 'border-rose-500 focus:ring-rose-400'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-400'
        }`}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
