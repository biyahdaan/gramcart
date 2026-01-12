
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ GramCart Database Connected Successfully"))
  .catch(err => console.error("❌ Database Connection Error:", err));

// Schemas
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor'], default: 'user' }
});

const VendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessName: String,
  category: String,
  description: String,
  serviceArea: Number,
  price: Number,
  verified: { type: Boolean, default: false },
  rating: { type: Number, default: 5.0 },
  image: { type: String, default: 'https://picsum.photos/seed/gram/400/300' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } 
  }
});

VendorSchema.index({ location: '2dsphere' });

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendorName: String,
  amount: Number,
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'confirmed', 'delivered', 'cancelled'], default: 'pending' },
  otp: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);
const Vendor = mongoose.model('Vendor', VendorSchema);
const Booking = mongoose.model('Booking', BookingSchema);

// Auth Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'GRAM_SECRET_KEY');
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'GRAM_SECRET_KEY');
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { 
    res.status(400).json({ error: "Email already registered" }); 
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'GRAM_SECRET_KEY');
      res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid Credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/api/search-vendors', async (req, res) => {
  try {
    const { q, lat, lng } = req.query;
    let query = {};
    if (q) {
      query.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 25000 
        }
      };
    }
    const vendors = await Vendor.find(query);
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

app.post('/api/book-service', authenticate, async (req, res) => {
  try {
    const { vendorId, amount, vendorName } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const booking = new Booking({
      userId: req.userId,
      vendorId,
      vendorName,
      amount,
      otp,
      status: 'pending'
    });
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: "Booking failed" });
  }
});

app.get('/api/my-bookings', authenticate, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.userId }).sort({ date: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// Vendor Dashboard Endpoints
app.get('/api/vendor/dashboard', authenticate, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.userId });
    if (!vendor) return res.status(404).json({ error: "Vendor profile not found" });

    const bookings = await Booking.find({ vendorId: vendor._id }).sort({ date: -1 });
    const delivered = bookings.filter(b => b.status === 'delivered');
    const totalEarnings = delivered.reduce((sum, b) => sum + b.amount, 0);

    res.json({
      vendor,
      bookings,
      totalEarnings,
      deliveredCount: delivered.length,
      pendingCount: bookings.filter(b => b.status === 'pending').length
    });
  } catch (err) {
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
});

app.post('/api/vendor/complete-booking', authenticate, async (req, res) => {
  try {
    const { bookingId, otp } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    
    if (booking.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP provided by customer" });
    }

    booking.status = 'delivered';
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

app.post('/api/register-vendor', authenticate, async (req, res) => {
  try {
    const { businessName, category, description, serviceArea, price, lat, lng } = req.body;
    const vendor = new Vendor({ 
      userId: req.userId, businessName, category, description, serviceArea, price,
      location: { type: 'Point', coordinates: [lng, lat] }
    });
    await vendor.save();
    await User.findByIdAndUpdate(req.userId, { role: 'vendor' });
    res.json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 GramCart Server Ready` ));
