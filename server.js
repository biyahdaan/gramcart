
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// --- MIDDLEWARE ---
// CORS को पूरी तरह ओपन किया गया है ताकि किसी भी डोमेन से फ्रंटएंड कनेक्ट हो सके
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 GramCart Scalable Engine Online"))
  .catch(err => console.error("❌ DB Connection Error:", err));

// --- SCHEMAS ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor'], default: 'user' }
}));

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  businessName: { type: String, required: true, index: true },
  rating: { type: Number, default: 5 },
  isVerified: { type: Boolean, default: false }
}));

const Service = mongoose.models.Service || mongoose.model('Service', new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  category: { type: String, index: true },
  title: String,
  pricePerDay: Number
}));

// --- ROUTES ---

// 1. Root Route Fix: Render par "Cannot GET /" को ठीक करने के लिए
app.get('/', (req, res) => {
  res.json({ 
    status: "GramCart API is Running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// 2. Auth: Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const user = new User({ name, email, password, role });
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

// 3. Auth: Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, 'GRAM_SECRET_KEY');
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});

// 4. Search Vendors
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

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ******************************************
  ✅ Server is active on port ${PORT}
  🔗 Local: http://localhost:${PORT}
  🌍 Health Check: http://localhost:${PORT}/
  ******************************************
  `);
});
