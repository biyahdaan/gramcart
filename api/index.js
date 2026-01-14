
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const MONGO_URI = "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";
const JWT_SECRET = "gramcart_secure_9922";

let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log("✅ DB Connected Successfully");
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
  }
};

// --- Models ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  location: { lat: Number, lng: Number }
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const VendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  businessName: { type: String, required: true },
  upiId: { type: String, default: '' },
  totalEarnings: { type: Number, default: 0 },
  rating: { type: Number, default: 5 }
}, { timestamps: true });
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

const ServiceSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  title: { type: String, required: true },
  category: { type: String, required: true },
  rate: { type: Number, required: true },
  unitType: { type: String, default: 'Per Day' },
  images: [String],
  description: String
}, { timestamps: true });
const Service = mongoose.models.Service || mongoose.model('Service', ServiceSchema);

const BookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  startDate: Date,
  endDate: Date,
  address: String,
  totalAmount: Number,
  otp: String,
  status: { type: String, default: 'pending' }
}, { timestamps: true });
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

// --- API Endpoints ---

app.post('/api/register', async (req, res) => {
  await connectDB();
  try {
    const { name, email, mobile, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Convert empty string to undefined to avoid MongoDB unique index error
    const finalEmail = (email && email.trim() !== "") ? email : undefined;

    const user = new User({ name, email: finalEmail, mobile, password: hashedPassword, role });
    await user.save();

    if (role === 'vendor') {
      const vendor = new Vendor({ userId: user._id, businessName: `${name}'s Services` });
      await vendor.save();
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: "Registration failed. Mobile/Email already exists." });
  }
});

app.post('/api/login', async (req, res) => {
  await connectDB();
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    const vendor = user.role === 'vendor' ? await Vendor.findOne({ userId: user._id }) : null;
    res.json({ token, user, vendor });
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});

app.get('/api/search', async (req, res) => {
  await connectDB();
  try {
    const vendors = await Vendor.find().lean();
    const results = await Promise.all(vendors.map(async (v) => {
      const services = await Service.find({ vendorId: v._id });
      return { ...v, services };
    }));
    res.json(results);
  } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

app.post('/api/services', async (req, res) => {
  await connectDB();
  try {
    const service = new Service(req.body);
    await service.save();
    res.json(service);
  } catch (err) { res.status(500).json({ error: "Service creation error" }); }
});

app.get('/api/my-services/:vendorId', async (req, res) => {
  await connectDB();
  try {
    const services = await Service.find({ vendorId: req.params.vendorId });
    res.json(services);
  } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

app.post('/api/bookings', async (req, res) => {
  await connectDB();
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json(booking);
  } catch (err) { res.status(500).json({ error: "Booking error" }); }
});

app.get('/api/my-bookings/:role/:id', async (req, res) => {
  await connectDB();
  try {
    const { role, id } = req.params;
    let query = role === 'vendor' ? { vendorId: id } : { customerId: id };
    const items = await Booking.find(query).populate('serviceId vendorId customerId').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

app.patch('/api/bookings/:id/status', async (req, res) => {
  await connectDB();
  try {
    const { status } = req.body;
    const b = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (status === 'completed') {
      await Vendor.findByIdAndUpdate(b.vendorId, { $inc: { totalEarnings: b.totalAmount } });
    }
    res.json(b);
  } catch (err) { res.status(500).json({ error: "Update error" }); }
});

app.get('/api/admin/all-data', async (req, res) => {
  await connectDB();
  try {
    const users = await User.find();
    const bookings = await Booking.find().populate('serviceId vendorId customerId');
    const services = await Service.find().populate('vendorId');
    res.json({ users, bookings, services });
  } catch (err) { res.status(500).json({ error: "Admin fetch error" }); }
});

module.exports = app;
