import styles from "./TabBar.module.css";

export interface Tab {
  id: string;
  label: string;
}

export interface TabBarProps {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function TabBar({ tabs, activeId, onSelect }: TabBarProps) {
  return (
    <div className={styles.bar} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className={`${styles.tab} ${tab.id === activeId ? styles.active : ""}`}
          aria-selected={tab.id === activeId}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
