import type { ReactNode } from "react";

import styles from "./Card.module.css";

export type CardAccent = "neutral" | "habit" | "mood";

export interface CardProps {
  accent?: CardAccent;
  children: ReactNode;
}

export function Card({ accent = "neutral", children }: CardProps) {
  return <div className={`${styles.card} ${styles[accent]}`}>{children}</div>;
}
