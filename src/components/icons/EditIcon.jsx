export default function EditIcon({ size = 16, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="12" height="15" rx="1.5" />
      <line x1="10.5" y1="14.5" x2="19" y2="6" />
      <path d="M17.8 5.2 19.5 3.5" />
      <path d="M9.5 14.5 8 16" />
    </svg>
  )
}
