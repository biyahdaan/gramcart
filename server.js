
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 GramCart Scalable Engine Online"))
  .catch(err => console.error("❌ DB Error:", err));

// --- ADVANCED SCHEMAS ---

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor'], default: 'user' },
  isVerified: { type: Boolean, default: false }
});

const VendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
  businessName: { type: String, required: true, index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  rating: { type: Number, default: 5, index: true },
  reviewsCount: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false, index: true }
});
VendorSchema.index({ location: '2dsphere' });

const ServiceSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  category: { type: String, index: true },
  title: String,
  pricePerDay: { type: Number, index: true },
  peakSeasonPrice: Number,
  inventory: [{ itemName: String, quantity: Number }],
  minBookingDays: { type: Number, default: 1 }
});

const ComboSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  title: String, // e.g., "Mega Shaadi Package"
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  originalPrice: Number,
  discountPrice: Number, // Value Deal
  isValueDeal: { type: Boolean, default: true }
});

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  items: Array,
  totalAmount: Number,
  status: { type: String, default: 'pending', index: true },
  otp: String,
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Vendor = mongoose.model('Vendor', VendorSchema);
const Service = mongoose.model('Service', ServiceSchema);
const Combo = mongoose.model('Combo', ComboSchema);
const Booking = mongoose.model('Booking', BookingSchema);

// --- API ---

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, 'GRAM_SECRET_KEY');
    req.userId = decoded.id;
    next();
  } catch (err) { res.status(401).json({ error: "Invalid token" }); }
};

// Scalable Paginated Search
app.get('/api/search', async (req, res) => {
  try {
    const { lat, lng, cat, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 25000 
        }
      };
    }
    if (cat) query.category = cat;

    const vendors = await Vendor.find(query).skip(skip).limit(parseInt(limit)).lean();
    
    // Enrich with Services and Combos
    const results = await Promise.all(vendors.map(async (v) => {
      const services = await Service.find({ vendorId: v._id });
      const combos = await Combo.find({ vendorId: v._id });
      return { ...v, services, combos };
    }));

    res.json(results);
  } catch (err) { res.status(500).json({ error: "Search failed" }); }
});

// Vendor Action: Create Combo
app.post('/api/vendor/combos', authenticate, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.userId });
    const combo = new Combo({ ...req.body, vendorId: vendor._id });
    await combo.save();
    res.json(combo);
  } catch (err) { res.status(500).json({ error: "Failed to create combo" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
