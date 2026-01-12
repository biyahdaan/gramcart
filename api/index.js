
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";

let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
  } catch (err) {
    console.error("❌ DB Error:", err);
  }
};

// --- Models ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
}));

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessName: { type: String, index: true },
  rating: { type: Number, default: 5 },
  isVerified: { type: Boolean, default: false }
}));

const Service = mongoose.models.Service || mongoose.model('Service', new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  category: { type: String, index: true },
  title: String,
  pricePerDay: Number
}));

// --- Routes ---
app.post('/api/login', async (req, res) => {
  await connectDB();
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    const token = jwt.sign({ id: user._id }, 'SECRET');
    res.json({ token, user });
  } else {
    res.status(401).json({ error: "Invalid login credentials" });
  }
});

app.post('/api/register', async (req, res) => {
  await connectDB();
  try {
    const user = new User(req.body);
    await user.save();
    
    // Auto-create vendor profile if role is vendor
    if (user.role === 'vendor') {
      const vendor = new Vendor({ userId: user._id, businessName: `${user.name}'s Shop` });
      await vendor.save();
    }
    
    const token = jwt.sign({ id: user._id }, 'SECRET');
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: "User already exists or missing fields" });
  }
});

app.get('/api/search', async (req, res) => {
  await connectDB();
  const { cat } = req.query;
  try {
    const vendors = await Vendor.find().lean();
    const enriched = await Promise.all(vendors.map(async (v) => {
      let query = { vendorId: v._id };
      if (cat) query.category = cat;
      const services = await Service.find(query);
      return { ...v, services };
    }));
    // Filter out vendors with no matching services if category is provided
    const filtered = cat ? enriched.filter(v => v.services.length > 0) : enriched;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = app;
