import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api";
import Button from "../components/Button";
import PriceDisplay from "../components/PriceDisplay";
import StatusBadge from "../components/StatusBadge";
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

  if (loading) return <div className={styles["admin-loading"]}>Loading dashboard...</div>;

  return (
    <div className={styles["admin-bg"]}>
      <div className={styles["admin-header"]}>
        <div>
          <h1 className={styles["admin-title"]}>Admin Dashboard</h1>
          <p className={styles["admin-subtitle"]}>Manage auction items and monitor activity</p>
        </div>
        {!showForm && (
          <Button type="button" onClick={() => setShowForm(true)}>
            + Add New Item
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles["admin-form"]}>
          <div className={styles["admin-form-grid"]}>
            <div>
              <label className={styles["admin-form-label"]} htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                name="title"
                value={newItem.title}
                onChange={handleChange}
                className={styles["admin-form-input"]}
                required
              />
            </div>
            <div>
              <label className={styles["admin-form-label"]} htmlFor="imageUrl">Image URL</label>
              <input
                id="imageUrl"
                type="url"
                name="imageUrl"
                value={newItem.imageUrl}
                onChange={handleChange}
                className={styles["admin-form-input"]}
                required
              />
            </div>
            <div>
              <label className={styles["admin-form-label"]} htmlFor="basePrice">Base Price</label>
              <input
                id="basePrice"
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
              <label className={styles["admin-form-label"]} htmlFor="endDate">End Date</label>
              <input
                id="endDate"
                type="datetime-local"
                name="endDate"
                value={newItem.endDate}
                onChange={handleChange}
                className={styles["admin-form-input"]}
                required
              />
            </div>
            <div className={styles["admin-form-wide"]}>
              <label className={styles["admin-form-label"]} htmlFor="description">Description</label>
              <textarea
                id="description"
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
            <Button
              type="button"
              onClick={() => setShowForm(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Auction Item
            </Button>
          </div>
        </form>
      )}

      <div className={styles["table-card"]}>
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
                <td data-label="Item">
                  <div className={styles["item-cell"]}>
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className={styles["item-thumb"]} />
                    )}
                    <span>{item.title}</span>
                  </div>
                </td>
                <td data-label="Highest Bid"><PriceDisplay value={item.currentPrice || item.basePrice} /></td>
                <td data-label="Status"><StatusBadge isClosed={item.isClosed} /></td>
                <td data-label="Actions">
                  <div className={styles["actions"]}>
                    {!item.isClosed && (
                      <Button
                        type="button"
                        variant="warning"
                        onClick={() => closeAuction(item._id)}
                      >
                        Close
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => deleteAuction(item._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className={styles["empty-admin"]}>No auction items have been created yet.</div>
        )}
      </div>
    </div>
  );
}
