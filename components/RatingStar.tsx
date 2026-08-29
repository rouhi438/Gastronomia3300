type RatingStarProps = {
  size?: number;
  className?: string;
};

export default function RatingStar({ size = 20, className }: RatingStarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 1.4 15.25 8l7.28 1.06-5.27 5.14 1.24 7.25L12 18.03l-6.5 3.42 1.24-7.25-5.27-5.14L8.75 8 12 1.4Z"
      />
    </svg>
  );
}
