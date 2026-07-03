import styles from "./XPBar.module.css";

export interface XPBarProps {
  progress: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function XPBar({ progress }: XPBarProps) {
  const clamped = clamp(progress, 0, 100);
  const state = clamped === 0 ? "empty" : clamped === 100 ? "full" : "partial";

  return (
    <div className={styles.track} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className={`${styles.fill} ${styles[state]}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
