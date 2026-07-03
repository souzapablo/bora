import type { ChangeEvent } from "react";

import styles from "./Input.module.css";

export interface InputProps {
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export function Input({ error = false, disabled = false, placeholder, value, onChange }: InputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <input
      type="text"
      className={`${styles.input} ${error ? styles.error : ""}`}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      aria-invalid={error}
    />
  );
}
