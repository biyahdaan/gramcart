
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// --- MIDDLEWARE ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 GramCart Engine Online"))
  .catch(err => console.error("❌ DB Error:", err));

// --- SCHEMAS ---

// Extended User Schema with Mobile support
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, index: true }, // sparse allows nulls but keeps uniqueness for values
  mobile: { type: String, unique: true, required: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor'], default: 'user' }
}));

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  businessName: { type: String, required: true, index: true },
  rating: { type: Number, default: 5 },
  isVerified: { type: Boolean, default: false }
}));

// Extended Service Schema for Inventory
const Service = mongoose.models.Service || mongoose.model('Service', new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  category: { type: String, index: true },
  title: String,
  unitType: { type: String, enum: ['Per Day', 'Per Piece', 'Per Sq Ft', 'Per Meter'], default: 'Per Day' },
  rate: { type: Number, required: true },
  itemsIncluded: [String],
  duration: { type: String, default: '1 Day' },
  createdAt: { type: Date, default: Date.now }
}));

// --- ROUTES ---

app.get('/', (req, res) => {
  res.json({ status: "GramCart API Running", features: ["Dual Auth", "Inventory Management"] });
});

// Dual Auth: Register (Supports Email & Mobile)
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;
    
    // Check for existing users to prevent E11000 errors gracefully
    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) {
      return res.status(400).json({ error: "Email or Mobile already registered" });
    }

    const user = new User({ name, email, mobile, password, role });
    await user.save();

    if (role === 'vendor') {
      const vendor = new Vendor({ userId: user._id, businessName: `${name}'s Shop` });
      await vendor.save();
    }

    const token = jwt.sign({ id: user._id }, 'GRAM_SECRET_KEY');
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

// Dual Auth: Login (Email OR Mobile)
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // 'identifier' can be email or mobile
    const user = await User.findOne({ 
      $or: [{ email: identifier }, { mobile: identifier }], 
      password 
    });
    
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, 'GRAM_SECRET_KEY');
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});

// Vendor: Add Detailed Service
app.post('/api/services', async (req, res) => {
  try {
    const { vendorId, category, title, unitType, rate, itemsIncluded, duration } = req.body;
    const service = new Service({ 
      vendorId, 
      category, 
      title, 
      unitType, 
      rate, 
      itemsIncluded, 
      duration 
    });
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: "Failed to add service" });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { cat } = req.query;
    const vendors = await Vendor.find().lean();
    
    const results = await Promise.all(vendors.map(async (v) => {
      let serviceQuery = { vendorId: v._id };
      if (cat) serviceQuery.category = cat;
      const services = await Service.find(serviceQuery);
      return { ...v, services };
    }));

    const filtered = cat ? results.filter(v => v.services.length > 0) : results;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
