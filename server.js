
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '20mb' })); 

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI).then(() => console.log("🚀 GramCart Server Ready")).catch(err => console.error("❌ DB Error:", err));

// --- SCHEMAS ---

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
  location: { lat: Number, lng: Number }
});
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

const ServiceSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true, required: true },
  category: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  unitType: { type: String, default: 'Per Day' },
  rate: { type: Number, required: true },
  images: [String],
  contactNumber: { type: String, required: true },
  upiId: { type: String },
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
  advanceProof: String,
  finalProof: String,
  otp: { type: String, required: true }, 
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'awaiting_advance_verification', 'advance_paid', 'awaiting_final_verification', 'final_paid', 'completed', 'rejected'], 
    default: 'pending' 
  },
  review: { rating: Number, comment: String },
  createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

// --- ROUTES ---

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role, location } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) return res.status(400).json({ error: "Already Registered" });
    const user = new User({ name, email, mobile, password, role, location });
    await user.save();
    if (role === 'vendor') {
      const vendor = new Vendor({ userId: user._id, businessName: `${name}'s Shop`, location });
      await vendor.save();
    }
    res.status(201).json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }], password });
    if (!user) return res.status(401).json({ error: "Invalid Credentials" });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/services', async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/services/:id', async (req, res) => {
    try {
      await Service.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const { cat } = req.query;
    const vendors = await Vendor.find().lean();
    const results = await Promise.all(vendors.map(async (v) => {
      let query = { vendorId: v._id };
      if (cat) query.category = cat;
      const services = await Service.find(query).sort({ createdAt: -1 });
      return { ...v, services };
    }));
    res.json(cat ? results.filter(v => v.services.length > 0) : results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-services/:vendorId', async (req, res) => {
  try {
    const services = await Service.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 });
    res.json(services);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-bookings/:role/:id', async (req, res) => {
  try {
    const { role, id } = req.params;
    let query = {};
    if (role === 'vendor') {
        const v = await Vendor.findOne({ userId: id });
        query = { vendorId: v ? v._id : null };
    } else {
        query = { customerId: id };
    }
    const bookings = await Booking.find(query).populate('serviceId').populate('vendorId').populate('customerId').sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(5000, () => console.log('Server running on 5000'));
