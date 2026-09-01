import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { currentUser, logout, isAdmin } = useAuth();

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <Link to="/" aria-label="Silent Auction home">
          <span className={styles.logoMark} aria-hidden="true">⌘</span>
          <span>Silent Auction</span>
        </Link>
      </div>
      <div className={styles.links}>
        <span className={styles.email}>{currentUser?.email}</span>
        {isAdmin && (
          <Link className={styles.adminLink} to="/admin">Admin</Link>
        )}
        <button className={styles.logout} onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
