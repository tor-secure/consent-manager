import { BRAND } from "@/lib/brand";

export default function Icon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 118" fill="none">
      <path
        d="M50 8.2L88.4 24.2v35.4c0 21.6-14.6 37.4-38.4 45.8C26.2 97 11.6 81.2 11.6 59.6V24.2L50 8.2z"
        stroke={BRAND.navy}
        strokeWidth="11"
        strokeLinejoin="miter"
        strokeMiterlimit={3}
      />
      <path
        d="M34.2 57.2l13.4 13.6 24.8-26.4"
        stroke={BRAND.teal}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
