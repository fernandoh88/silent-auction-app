import styles from "./Button.module.css";

export default function Button({
  as: Component = "button",
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  return (
    <Component
      className={`${styles.button} ${styles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}
