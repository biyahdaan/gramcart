const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '20mb' })); 

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI).then(() => console.log("🚀 GramCart Server Ready")).catch(err => console.error("❌ DB Error:", err));

// --- SCHEMAS (Flipkart-Style Expanded) ---

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, index: true },
  mobile: { type: String, unique: true, required: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor'], default: 'user' },
  location: { lat: Number, lng: Number },
  savedAddress: String,
  savedPincode: String,
  savedAltMobile: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const VendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  businessName: { type: String, required: true, index: true },
  upiId: { type: String, default: 'merchant@upi' },
  location: { lat: Number, lng: Number },
  totalEarnings: { type: Number, default: 0 } // Flipkart Seller Hub Earnings
});
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

const ServiceSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true, required: true },
  category: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  inventoryList: [String], // New: For Items like 2 Bass, 4 Tops, etc.
  unitType: { type: String, default: 'Per Day' },
  rate: { type: Number, required: true },
  images: [String],
  contactNumber: { type: String, required: true },
  upiId: { type: String },
  advancePercent: { type: Number, default: 10 }, // New: Advance demand
  variant: { type: String, enum: ['Simple', 'Standard', 'Premium'], default: 'Simple' },
  isActive: { type: Boolean, default: true }, // Flipkart Out of Stock / Active
  createdAt: { type: Date, default: Date.now }
});
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);

const BookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  startDate: Date,
  endDate: Date,
  address: String,
  pincode: String,
  altMobile: String,
  totalAmount: Number,
  paidAdvance: { type: Number, default: 0 },
  advanceProof: String, // Screenshot URL
  finalProof: String,
  otp: { type: String, required: true }, 
  status: { type: String, enum: ['pending', 'approved', 'advance_paid', 'live', 'completed', 'cancelled'], default: 'pending' },
  review: { rating: Number, comment: String },
  createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

// --- ROUTES ---

// Fix Register: Automatically create Vendor Hub
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role, location } = req.body;
    const user = new User({ name, email, mobile, password, role, location });
    await user.save();
    if (role === 'vendor') {
      const vendor = new Vendor({ userId: user._id, businessName: `${name}'s Shop`, location });
      await vendor.save();
    }
    res.status(201).json({ user });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }], password });
    if (!user) return res.status(401).json({ error: "Invalid Credentials" });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fixed: Add Service with Itemized Inventory & No Empty ID Error
app.post('/api/services', async (req, res) => {
  try {
    const { _id, ...serviceData } = req.body; // Remove empty ID if present
    if (!mongoose.Types.ObjectId.isValid(serviceData.vendorId)) throw new Error("Invalid Vendor ID");
    const service = new Service(serviceData);
    await service.save();
    res.status(201).json(service);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// New: Get Single Service Detail (For Detail View)
app.get('/api/services/:id', async (req, res) => {
    try {
      const service = await Service.findById(req.params.id).populate('vendorId');
      res.json(service);
    } catch (err) { res.status(404).json({ error: "Service not found" }); }
});

app.put('/api/services/:id', async (req, res) => {
    try {
      const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(service);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// Flipkart Style Search: Show Categories & Services
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q ? { title: { $regex: req.query.q, $options: 'i' } } : {};
    const services = await Service.find({ ...query, isActive: true }).populate('vendorId');
    res.json(services);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-services/:vendorId', async (req, res) => {
  try {
    const services = await Service.find({ vendorId: req.params.vendorId });
    res.json(services);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json(booking);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/my-bookings/:role/:id', async (req, res) => {
  try {
    const { role, id } = req.params;
    let query = {};
    if (role === 'vendor') {
        const v = await Vendor.findOne({ userId: id });
        query = { vendorId: v?._id };
    } else {
        query = { customerId: id };
    }
    const bookings = await Booking.find(query)
      .populate('serviceId')
      .populate('vendorId')
      .populate('customerId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Advanced Tracker Status Update
app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    // Update Vendor Earnings if completed
    if (req.body.status === 'completed') {
       await Vendor.findByIdAndUpdate(booking.vendorId, { $inc: { totalEarnings: booking.totalAmount } });
    }
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(5000, () => console.log('🚀 GramCart Server running on 5000'));