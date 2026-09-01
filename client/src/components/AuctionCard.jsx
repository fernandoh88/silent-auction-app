import { Link } from "react-router-dom";
import Button from "./Button";
import PriceDisplay from "./PriceDisplay";
import StatusBadge from "./StatusBadge";
import styles from "./AuctionCard.module.css";

export default function AuctionCard({ item, timeLeft }) {
  const currentBid = item.currentPrice || item.basePrice;
  const description = item.description || "No description provided.";

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <img
          src={item.imageUrl}
          alt={item.title}
          className={styles.image}
          loading="lazy"
        />
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <h2 className={styles.title}>{item.title}</h2>
          <StatusBadge isClosed={item.isClosed} />
        </div>
        <p className={styles.description}>{description}</p>
        <div className={styles.metrics}>
          <div>
            <span className={styles.label}>Current Bid</span>
            <strong className={styles.price}>
              <PriceDisplay value={currentBid} />
            </strong>
          </div>
          <div>
            <span className={styles.label}>Remaining</span>
            <strong className={styles.time}>{timeLeft}</strong>
          </div>
        </div>
        <Button as={Link} to={`/item/${item._id}`} className={styles.action}>
          View Details
        </Button>
      </div>
    </article>
  );
}
