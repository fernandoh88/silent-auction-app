import styles from "./StatusBadge.module.css";

export default function StatusBadge({ isClosed }) {
  return (
    <span className={`${styles.badge} ${isClosed ? styles.closed : styles.open}`}>
      {isClosed ? "Closed" : "Open"}
    </span>
  );
}
