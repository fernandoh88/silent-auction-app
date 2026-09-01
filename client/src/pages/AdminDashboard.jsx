import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    imageUrl: '',
    basePrice: '',
    endDate: ''
  });
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || !isAdmin) {
      navigate('/');
      return;
    }

    const fetchItems = async () => {
      try {
        const res = await api.get("/api/items");
        setItems(res.data);
      } catch (err) {
        console.error("Failed to fetch items:", err);
        alert("Error loading items");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [currentUser, isAdmin, navigate]);

  const closeAuction = async (itemId) => {
    if (!window.confirm("Close this auction? This will determine a winner.")) return;

    try {
      const res = await api.patch(`/api/items/${itemId}/close`);
      setItems(prev => prev.map(item => 
        item._id === itemId ? res.data : item
      ));
      alert(`Auction closed. Winner: ${res.data.winnerEmail || 'No bids'}`);
    } catch (err) {
      console.error("Failed to close auction:", err);
      alert(err.response?.data?.message || "Error closing auction");
    }
  };

  const deleteAuction = async (itemId) => {
    if (!window.confirm("Delete this auction? This cannot be undone.")) return;

    try {
      await api.delete(`/api/items/${itemId}`);
      setItems(prev => prev.filter(item => item._id !== itemId));
      alert("Auction deleted successfully");
    } catch (err) {
      console.error("Failed to delete auction:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      alert(err.response?.data?.message || "Error deleting auction");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate endDate before submitting
    if (!newItem.endDate) {
      alert("End date is required.");
      return;
    }
    const formattedEndDate = new Date(newItem.endDate);
    if (isNaN(formattedEndDate.getTime())) {
      alert("End date is invalid.");
      return;
    }

    try {
      const response = await api.post('/api/items', {
        title: newItem.title,
        description: newItem.description,
        imageUrl: newItem.imageUrl,
        basePrice: parseFloat(newItem.basePrice),
        endDate: formattedEndDate.toISOString()
      });
      setItems(prev => [...prev, response.data]);
      setNewItem({
        title: '',
        description: '',
        imageUrl: '',
        basePrice: '',
        endDate: ''
      });
      setShowForm(false);
      alert('New auction item created successfully!');
    } catch (err) {
      console.error('Failed to create item:', err);
      alert(err.response?.data?.message || 'Error creating auction item');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles["admin-bg"]}>
      <div className={styles["admin-header"]}>
        <h1 className={styles["admin-title"]}>Admin Dashboard</h1>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles["admin-form"]}>
          <div className={styles["admin-form-grid"]}>
            <div>
              <label className={styles["admin-form-label"]}>Title</label>
              <input
                type="text"
                name="title"
                value={newItem.title}
                onChange={handleChange}
                className={styles["admin-form-input"]}
                required
              />
            </div>
            <div>
              <label className={styles["admin-form-label"]}>Image URL</label>
              <input
                type="url"
                name="imageUrl"
                value={newItem.imageUrl}
                onChange={handleChange}
                className={styles["admin-form-input"]}
                required
              />
            </div>
            <div>
              <label className={styles["admin-form-label"]}>Base Price ($)</label>
              <input
                type="number"
                name="basePrice"
                value={newItem.basePrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={styles["admin-form-input"]}
                required
              />
            </div>
            <div>
              <label className={styles["admin-form-label"]}>End Date</label>
              <input
                type="datetime-local"
                name="endDate"
                value={newItem.endDate}
                onChange={handleChange}
                className={styles["admin-form-input"]}
                required
              />
            </div>
            <div>
              <label className={styles["admin-form-label"]}>Description</label>
              <textarea
                name="description"
                value={newItem.description}
                onChange={handleChange}
                className={styles["admin-form-textarea"]}
                rows="3"
                required
              />
            </div>
          </div>
          <div className={styles["admin-form-actions"]}>
            <button
              type="submit"
              className={styles["admin-btn"]}
            >
              Create Auction Item
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={styles["admin-btn"]}
              style={{ marginLeft: '1rem', background: '#ccc', color: '#333' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <table className={styles["admin-table"]}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Highest Bid</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item._id}>
              <td>{item.title}</td>
              <td>${item.currentPrice || item.basePrice}</td>
              <td>{item.isClosed ? "Closed" : "Open"}</td>
              <td>
                {!item.isClosed && (
                  <button
                    onClick={() => closeAuction(item._id)}
                    className={`${styles["admin-action-btn"]} ${styles["close"]}`}
                  >
                    Close
                  </button>
                )}
                <button
                  onClick={() => deleteAuction(item._id)}
                  className={`${styles["admin-action-btn"]} ${styles["delete"]}`}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!showForm && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => setShowForm(true)}
            className={styles["admin-btn"]}
          >
            Add New Item
          </button>
        </div>
      )}
    </div>
  );
}
