import styles from "./MoodPicker.module.css";

// SPEC_DEVIATION: Mood is a placeholder type (no MoodEntry domain code exists yet).
// Reason: design.md flags this as a risk to revisit once the Mental Health module defines its own mood taxonomy.
export type Mood = "great" | "good" | "okay" | "low" | "bad";

export interface MoodPickerProps {
  options: Mood[];
  selected?: Mood;
  onSelect: (mood: Mood) => void;
}

export function MoodPicker({ options, selected, onSelect }: MoodPickerProps) {
  return (
    <div className={styles.picker}>
      {options.map((mood) => (
        <button
          key={mood}
          type="button"
          className={`${styles.option} ${mood === selected ? styles.selected : ""}`}
          aria-pressed={mood === selected}
          onClick={() => onSelect(mood)}
        >
          {mood}
        </button>
      ))}
    </div>
  );
}
