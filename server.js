
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = "gramcart_secure_9922";

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const MONGO_URI = "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI).then(() => console.log("🚀 MongoDB Connected")).catch(err => console.error("❌ DB Error:", err));

// --- Schemas ---

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },
  location: { lat: Number, lng: Number }
});
const User = mongoose.model('User', UserSchema);

const VendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName: { type: String, required: true },
  upiId: { type: String, default: '' },
  rating: { type: Number, default: 5 },
  totalEarnings: { type: Number, default: 0 },
  location: { lat: Number, lng: Number }
});
const Vendor = mongoose.model('Vendor', VendorSchema);

const ServiceSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  rate: Number,
  unitType: { type: String, default: 'Per Day' },
  images: [String],
  inventoryList: Array,
  variant: String
});
const Service = mongoose.model('Service', ServiceSchema);

const BookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  startDate: Date,
  endDate: Date,
  address: String,
  pincode: String,
  totalAmount: Number,
  otp: String,
  status: { type: String, default: 'pending' },
  finalProof: String,
  createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', BookingSchema);

// --- Auth Routes ---

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role, location } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = new User({ 
      name, 
      email: email || undefined, 
      mobile, 
      password: hashedPassword, 
      role: role || 'user', 
      location 
    });
    await user.save();

    if (user.role === 'vendor') {
      const vendor = new Vendor({ 
        userId: user._id, 
        businessName: `${name}'s Services`,
        location 
      });
      await vendor.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    res.status(201).json({ user, token });
  } catch (err) { res.status(400).json({ error: "Registration failed. Mobile/Email may already exist." }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user) return res.status(401).json({ error: "User not found" });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect password" });
    
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    let vendor = null;
    if (user.role === 'vendor') vendor = await Vendor.findOne({ userId: user._id });
    
    res.json({ user, token, vendor });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Marketplace Routes ---

app.get('/api/search', async (req, res) => {
  try {
    const vendors = await Vendor.find().lean();
    const results = await Promise.all(vendors.map(async (v) => {
      const services = await Service.find({ vendorId: v._id });
      return { ...v, services };
    }));
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/services', async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (err) { res.status(400).json({ error: err.message }); }
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
    let query = role === 'vendor' ? { vendorId: id } : { customerId: id };
    const bookings = await Booking.find(query)
      .populate('serviceId')
      .populate('vendorId')
      .populate('customerId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (req.body.status === 'completed') {
      await Vendor.findByIdAndUpdate(booking.vendorId, { $inc: { totalEarnings: booking.totalAmount } });
    }
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/all-data', async (req, res) => {
  const users = await User.find().lean();
  const bookings = await Booking.find().populate('serviceId vendorId customerId').lean();
  const services = await Service.find().populate('vendorId').lean();
  res.json({ users, bookings, services });
});

app.listen(5000, () => console.log('🚀 Server running on 5000'));
