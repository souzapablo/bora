import styles from "./StreakBadge.module.css";

export interface StreakBadgeProps {
  active: boolean;
  count: number;
}

export function StreakBadge({ active, count }: StreakBadgeProps) {
  return (
    <span className={`${styles.badge} ${active ? styles.active : styles.inactive}`}>
      {count}
    </span>
  );
}
