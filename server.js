
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
app.use(express.json({ limit: '10mb' }));

// --- DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 GramCart Engine Online"))
  .catch(err => console.error("❌ DB Error:", err));

// --- SCHEMAS ---

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, index: true },
  mobile: { type: String, unique: true, required: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor'], default: 'user' }
}));

const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  businessName: { type: String, required: true, index: true },
  rating: { type: Number, default: 5 },
  isVerified: { type: Boolean, default: false },
  upiId: { type: String },
  advancePercent: { type: Number, default: 10 }
}));

const Service = mongoose.models.Service || mongoose.model('Service', new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true, required: true },
  category: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  unitType: { type: String, default: 'Per Day' },
  rate: { type: Number, required: true },
  itemsIncluded: [String],
  images: [String],
  contactNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}));

const Booking = mongoose.models.Booking || mongoose.model('Booking', new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  startDate: Date,
  endDate: Date,
  address: String,
  totalAmount: Number,
  advanceProof: String,
  advanceVerified: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'advance_paid', 'completed', 'reviewed', 'rejected', 'cancelled'], 
    default: 'pending' 
  },
  review: {
    rating: Number,
    comment: String
  },
  createdAt: { type: Date, default: Date.now }
}));

// --- ROUTES ---

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) return res.status(400).json({ error: "Mobile or Email already exists" });

    const user = new User({ name, email, mobile, password, role });
    await user.save();
    if (role === 'vendor') {
      const vendor = new Vendor({ userId: user._id, businessName: `${name}'s Shop` });
      await vendor.save();
    }
    const token = jwt.sign({ id: user._id }, 'GRAM_SECRET_KEY');
    res.status(201).json({ token, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }], password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id }, 'GRAM_SECRET_KEY');
    res.json({ token, user });
  } catch (err) { res.status(500).json({ error: "Login error" }); }
});

// FIXED SERVICE POSTING ROUTE
app.post('/api/services', async (req, res) => {
  try {
    console.log("Receiving Service Data:", req.body);
    const { vendorId, category, title, rate, contactNumber } = req.body;
    
    if (!vendorId || !category || !title || !rate || !contactNumber) {
      return res.status(400).json({ error: "Missing required fields: Title, Category, Rate, or Contact" });
    }

    const newService = new Service(req.body);
    const saved = await newService.save();
    res.status(201).json(saved);
  } catch (err) { 
    console.error("Service Save Error:", err);
    res.status(400).json({ error: err.message }); 
  }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const updated = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-services/:vendorId', async (req, res) => {
  try {
    const services = await Service.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 });
    res.json(services);
  } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const { cat } = req.query;
    const vendors = await Vendor.find().lean();
    const results = await Promise.all(vendors.map(async (v) => {
      let query = { vendorId: v._id };
      if (cat) query.category = cat;
      const services = await Service.find(query);
      return { ...v, services };
    }));
    const filtered = cat ? results.filter(v => v.services.length > 0) : results;
    res.json(filtered);
  } catch (err) { res.status(500).json({ error: "Search error" }); }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json(booking);
  } catch (err) { res.status(500).json({ error: "Booking error" }); }
});

app.get('/api/my-bookings/:role/:id', async (req, res) => {
  try {
    const { role, id } = req.params;
    let query = {};
    if (role === 'vendor') {
        const vendorDoc = await Vendor.findOne({ userId: id });
        query = { vendorId: vendorDoc ? vendorDoc._id : id };
    } else {
        query = { customerId: id };
    }
    const bookings = await Booking.find(query)
      .populate('customerId', 'name mobile')
      .populate('serviceId')
      .populate('vendorId', 'businessName upiId advancePercent')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: "Booking fetch error" }); }
});

app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(booking);
  } catch (err) { res.status(500).json({ error: "Status update failed" }); }
});

app.patch('/api/vendor-profile/:userId', async (req, res) => {
  try {
    const updated = await Vendor.findOneAndUpdate({ userId: req.params.userId }, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 GramCart Server running on ${PORT}`));
