import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import Button from "../components/Button";
import PriceDisplay from "../components/PriceDisplay";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime } from "../utils/formatters";
import styles from "./ItemDetails.module.css";

function TimeLeft({ endDate }) {
  const [timeLeft, setTimeLeft] = useState("Calculating...");

  useEffect(() => {
    const updateTimer = () => {
      if (!endDate) {
        setTimeLeft("No end date set");
        return;
      }
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;
      if (isNaN(difference)) {
        setTimeLeft("Invalid date");
        return;
      }
      if (difference <= 0) {
        setTimeLeft("Auction ended");
        return;
      }
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  return <>{timeLeft}</>;
}

export default function ItemDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [bids, setBids] = useState([]);
  const [newBid, setNewBid] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/items/${id}`)
      .then(res => {
        setItem(res.data.item);
        setBids(res.data.bids);
      })
      .catch(err => console.error("Error loading item:", err));
  }, [id]);

  const highestBid = item?.currentPrice || item?.basePrice;

  const onBidSubmit = async (e) => {
    e.preventDefault();
    const bidAmount = parseFloat(newBid);

    if (isNaN(bidAmount) || bidAmount <= highestBid) {
      alert(`Bid must be greater than current price ($${highestBid})`);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/api/items/${id}/bid`, {
        amount: bidAmount,
        itemId: id
      });

      setNewBid("");
      alert("Bid placed successfully!");

      setItem(prev => ({
        ...prev,
        currentPrice: bidAmount,
        currentBidder: response.data.userEmail
      }));

      setBids(prev => [...prev, {
        amount: bidAmount,
        userEmail: response.data.userEmail,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("Bid failed:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        stack: error.stack
      });

      const errorMessage = error.response?.data?.message
        || error.message
        || "Failed to place bid. Please try again.";
      alert(errorMessage);

    } finally {
      setLoading(false);
    }
  };

  if (!item) return <div className={styles.loading}>Loading auction item...</div>;

  return (
    <div className={styles["details-bg"]}>
      <div className={styles["details-shell"]}>
        <section className={styles["image-card"]} aria-label={`${item.title} image`}>
          <img
            src={item.imageUrl || "https://placehold.co/600x420"}
            alt={item.title}
            className={styles["details-img"]}
            onError={(e) => {
              e.target.src = "https://placehold.co/600x420";
              e.target.onerror = null;
            }}
          />
        </section>

        <section className={styles["details-panel"]}>
          <div className={styles["title-row"]}>
            <h1 className={styles["details-title"]}>{item.title}</h1>
            <StatusBadge isClosed={item.isClosed} />
          </div>
          <p className={styles["details-desc"]}>{item.description}</p>

          <dl className={styles["stats-grid"]}>
            <div>
              <dt>Highest Bid</dt>
              <dd><PriceDisplay value={highestBid} /></dd>
            </div>
            <div>
              <dt>Time Remaining</dt>
              <dd><TimeLeft endDate={item.endDate} /></dd>
            </div>
            <div>
              <dt>Highest Bidder</dt>
              <dd>{item.currentBidder || "No bids yet"}</dd>
            </div>
            <div>
              <dt>Ends</dt>
              <dd>{formatDateTime(item.endDate)}</dd>
            </div>
          </dl>

          {!item.isClosed ? (
            <form onSubmit={onBidSubmit} className={styles["details-form"]}>
              <label className={styles["bid-label"]} htmlFor="bidAmount">Bid amount</label>
              <div className={styles["bid-row"]}>
                <input
                  id="bidAmount"
                  type="number"
                  step="0.01"
                  min={highestBid + 0.01}
                  value={newBid}
                  onChange={e => setNewBid(e.target.value)}
                  className={styles["details-input"]}
                  placeholder="Enter your bid (USD)"
                  required
                  disabled={loading}
                />
                <Button type="submit" disabled={loading}>
                  {loading ? "Placing..." : "Place Bid"}
                </Button>
              </div>
            </form>
          ) : (
            <p className={styles["details-error"]}>This auction is closed.</p>
          )}

          <section className={styles["history-section"]}>
            <h2 className={styles["details-history-title"]}>Bid History</h2>
            <ul className={styles["details-history-list"]}>
              {bids.map((bid, idx) => (
                <li key={idx}>
                  <strong><PriceDisplay value={bid.amount} /></strong>
                  <span>{bid.userEmail}</span>
                  <time dateTime={new Date(bid.timestamp).toISOString()}>
                    {formatDateTime(bid.timestamp)}
                  </time>
                </li>
              ))}
              {bids.length === 0 && <li className={styles["empty-history"]}>No bids yet.</li>}
            </ul>
          </section>
        </section>
      </div>
    </div>
  );
}
