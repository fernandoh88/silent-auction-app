const express = require('express');
const router = express.Router();
const AuctionItem = require('../models/AuctionItem');
const Bid = require('../models/Bid');
const verifyToken = require('../middlewares/verifyToken');
const { sendWinnerEmail, sendOutbidEmail } = require('../utils/email');

// Get all auction items
router.get('/', async (req, res) => {
  try {
    const items = await AuctionItem.find().lean();
    
    // Check and update auction status based on endDate
    for (let item of items) {
      if (!item.isClosed && item.endDate && new Date() >= new Date(item.endDate)) {
        // Close auction
        await AuctionItem.findByIdAndUpdate(item._id, { isClosed: true });
        item.isClosed = true;

        // Find winning bid
        const winningBid = await Bid.find({ item: item._id }).sort({ amount: -1, timestamp: 1 }).limit(1);
        let winnerEmail = null;
        if (winningBid.length > 0) {
          winnerEmail = winningBid[0].userEmail;
        }
        // Save winner email to item
        await AuctionItem.findByIdAndUpdate(item._id, { winnerEmail });

        // Send winner email
        if (winnerEmail) {
          try {
            await sendWinnerEmail(winnerEmail, item.title);
            console.log(`Winner notification email sent to ${winnerEmail}`);
          } catch (err) {
            console.error('Failed to send winner email:', err);
          }
        }

        // Notify via socket
        const io = req.app.get('socketio');
        if (io) {
          io.emit('auctionEnded', item._id);
        }
      }
    }
    
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch items" });
  }
});

// Get one item by ID (including its bid history)
router.get('/:id', async (req, res) => {
  try {
    const item = await AuctionItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Item not found" });
    const bids = await Bid.find({ item: item._id }).sort({ timestamp: 1 }).lean();
    res.json({ item, bids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch item details" });
  }
});

// ✅ Place a bid on an item (protected)
router.post('/:id/bid', verifyToken, async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ message: "Bid amount is required and must be a number" });
  }

  try {
    const item = await AuctionItem.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    
    // Check if auction has ended based on endDate
    if (item.hasEnded()) {
      item.isClosed = true;
      await item.save();
      return res.status(400).json({ message: "Auction has ended" });
    }

    if (item.isClosed) {
      return res.status(400).json({ message: "Auction is closed" });
    }

    const bidAmount = parseFloat(amount);
    const currentPrice = item.currentPrice || item.basePrice;
    if (bidAmount <= currentPrice) {
      return res.status(400).json({ message: `Bid must be higher than current price ($${currentPrice})` });
    }

    // Store previous bidder info for outbid notification
    const previousBidder = item.currentBidder;
    const previousBidAmount = item.currentPrice;

    const bid = await Bid.create({
      item: id,
      userId: user.uid,
      userEmail: user.email,
      amount: bidAmount,
      timestamp: new Date()
    });

    item.currentPrice = bidAmount;
    item.currentBidder = user.email;
    await item.save();

    // Send outbid notification to previous highest bidder
    if (previousBidder && previousBidder !== user.email) {
      try {
        await sendOutbidEmail(previousBidder, item.title, bidAmount, previousBidAmount);
        console.log(`Outbid notification sent to ${previousBidder}`);
      } catch (err) {
        console.error('Failed to send outbid email:', err);
        // Don't fail the bid if email fails
      }
    }

    // Safely emit socket event
    const io = req.app.get('socketio');
    if (io) {
      io.emit('bidUpdate', {
        itemId: id,
        userEmail: user.email,
        amount: bidAmount,
        timestamp: bid.timestamp
      });
    } else {
      console.warn('Socket.IO not initialized');
    }

    return res.status(201).json({ message: "Bid placed", bidId: bid._id });
  } catch (err) {
    console.error('Detailed bid error:', err);
    res.status(500).json({ message: err.message || "Failed to place bid" });
  }
});

// ✅ Admin: Close an auction (protected)
router.patch('/:id/close', verifyToken, async (req, res) => {
  const user = req.user;
  const adminEmails = [process.env.ADMIN_EMAIL];

  if (!user || !adminEmails.includes(user.email)) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  try {
    const item = await AuctionItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.isClosed) return res.status(400).json({ message: "Auction already closed" });

    const winningBid = await Bid.find({ item: item._id }).sort({ amount: -1, timestamp: 1 }).limit(1);
    let winnerEmail = null;
    if (winningBid.length > 0) {
      winnerEmail = winningBid[0].userEmail;
    }
    item.isClosed = true;
    item.winnerEmail = winnerEmail;
    await item.save();

    if (winnerEmail) {
      try {
        await sendWinnerEmail(winnerEmail, item.title);
        console.log(`Winner notification email sent to ${winnerEmail}`);
      } catch (err) {
        console.error('Failed to send winner email:', err);
      }
    }

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to close auction" });
  }
});

// Delete an auction (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if ADMIN_EMAIL is loaded
    if (!process.env.ADMIN_EMAIL) {
      console.error('ADMIN_EMAIL not set in environment');
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Case-insensitive comparison
    if (req.user.email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
      console.log('Unauthorized delete attempt by:', req.user.email);
      return res.status(403).json({ message: "Only admin can delete auctions" });
    }

    const item = await AuctionItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Delete associated bids
    await Bid.deleteMany({ item: req.params.id });
    
    // Delete the item
    await AuctionItem.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Auction deleted successfully" });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: "Failed to delete auction" });
  }
});

// Create new auction item (admin only)
router.post('/', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: "Only admin can create auctions" });
    }

    const { title, description, imageUrl, basePrice, endDate } = req.body;

    // Validate required fields
    if (!title || !description || !imageUrl || basePrice === undefined || basePrice === null || basePrice === "") {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate basePrice is a valid number
    const basePriceNum = parseFloat(basePrice);
    if (isNaN(basePriceNum) || basePriceNum < 0) {
      return res.status(400).json({ message: "Base price must be a valid non-negative number" });
    }

    // Validate endDate
    if (!endDate) {
      return res.status(400).json({ message: "End date is required" });
    }

    const endDateTime = new Date(endDate);
    if (isNaN(endDateTime.getTime())) {
      return res.status(400).json({ message: "Invalid end date format" });
    }

    if (endDateTime <= new Date()) {
      return res.status(400).json({ message: "End date must be in the future" });
    }

    const newItem = new AuctionItem({
      title,
      description,
      imageUrl,
      basePrice: basePriceNum,
      endDate: endDateTime,
      createdBy: req.user.email
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ message: "Failed to create auction item" });
  }
});

module.exports = router;
