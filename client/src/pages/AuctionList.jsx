import { useEffect, useState } from "react";
import api from "../api";
import AuctionCard from "../components/AuctionCard";
import styles from "./AuctionList.module.css";

function TimeLeft({ endTime, onEnd }) {
  const [timeLeft, setTimeLeft] = useState('Calculating...');

  useEffect(() => {
    const updateTimer = () => {
      if (!endTime) {
        setTimeLeft('No end date set');
        return;
      }

      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (isNaN(difference)) {
        console.error('Invalid date calculation:', { endTime, end, now });
        setTimeLeft('Invalid date');
        return;
      }

      if (difference <= 0) {
        setTimeLeft('Auction ended');
        onEnd?.();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    // Initial update
    updateTimer();
    
    // Set up interval
    const timer = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timer);
  }, [endTime, onEnd]);

  return timeLeft;
}

export default function AuctionList() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Initial fetch
    fetchItems();

    // Listen for real-time updates
    const socket = window.socket;
    
    if (socket) {
      socket.on('itemUpdated', (updatedItem) => {
        setItems(prevItems => 
          prevItems.map(item => 
            item._id === updatedItem._id ? updatedItem : item
          )
        );
      });

      socket.on('auctionEnded', (itemId) => {
        setItems(prevItems =>
          prevItems.map(item =>
            item._id === itemId ? { ...item, isClosed: true } : item
          )
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('itemUpdated');
        socket.off('auctionEnded');
      }
    };
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get("/api/items");
      if (Array.isArray(res.data)) {
        setItems(res.data);
      } else if (Array.isArray(res.data.items)) {
        setItems(res.data.items);
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setItems([]);
    }
  };

  const filteredItems = Array.isArray(items)
    ? items
        .filter(item => item.title?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          const aEnd = new Date(a.endDate).getTime();
          const bEnd = new Date(b.endDate).getTime();
          // If either date is invalid, treat as far future
          if (isNaN(aEnd)) return 1;
          if (isNaN(bEnd)) return -1;
          return aEnd - bEnd;
        })
    : [];

  return (
    <div className={styles["auction-bg"]}>
      <section className={styles["auction-hero"]}>
        <h1 className={styles["auction-title"]}>Auction Items</h1>
        <p className={styles["auction-subtitle"]}>Browse and bid on exclusive items</p>
        <label className={styles["search-wrap"]}>
          <span className={styles["search-label"]}>Search items</span>
          <span className={styles["search-icon"]} aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search items..."
            className={styles["search-input"]}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
      </section>
      <div className={styles["auction-items-container"]}>
        {filteredItems.map((item) => (
          <AuctionCard
            key={item._id}
            item={item}
            timeLeft={<TimeLeft endTime={item.endDate} />}
          />
        ))}
        {filteredItems.length === 0 && (
          <div className={styles["empty-state"]}>
            <h2>No auction items found</h2>
            <p>Try a different search term.</p>
          </div>
        )}
      </div>
    </div>
  )
}

