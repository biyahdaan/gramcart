
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '20mb' })); 

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI).then(() => console.log("🚀 Server Connected")).catch(err => console.error("❌ DB Error:", err));

// --- Models ---

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, index: true },
  mobile: { type: String, unique: true, required: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },
  location: { lat: Number, lng: Number }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- MASTER ADMIN SETTINGS ---
const AdminSettingsSchema = new mongoose.Schema({
  adminID: { type: String, default: 'admin' },
  password: { type: String, default: '123' },
  adminUPI: { type: String, default: 'admin@okaxis' },
  adminWhatsApp: { type: String, default: '910000000000' },
  secretKey: { type: String, default: 'SUPERADMIN' }
});
const AdminSettings = mongoose.models.AdminSettings || mongoose.model('AdminSettings', AdminSettingsSchema);

const VendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  businessName: { type: String, required: true, index: true },
  upiId: { type: String, default: '' },
  location: { lat: Number, lng: Number },
  totalEarnings: { type: Number, default: 0 }
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
  variant: { type: String, enum: ['Simple', 'Standard', 'Premium'], default: 'Simple' },
  blockedDates: [String],
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
  status: { type: String, default: 'pending' },
  isVerified: { type: Boolean, default: false },
  review: { rating: Number, comment: String },
  createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

// --- Routes ---

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role, location } = req.body;
    const user = new User({ name, email, mobile, password, role, location });
    await user.save();
    if (role === 'vendor') {
      await new Vendor({ userId: user._id, businessName: `${name}'s Shop`, location }).save();
    }
    res.status(201).json({ user });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }], password });
    if (!user) return res.status(401).json({ error: "Invalid login" });
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

app.put('/api/services/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(service);
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
    const vendors = await Vendor.find().lean();
    const results = await Promise.all(vendors.map(async (v) => {
      const services = await Service.find({ vendorId: v._id });
      return { ...v, services };
    }));
    res.json(results);
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
    const bookings = await Booking.find(query).populate('serviceId').populate('vendorId').populate('customerId').sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (status === 'approved') {
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        const dateArray = [];
        let curr = new Date(startDate);
        while(curr <= endDate) {
            dateArray.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        await Service.findByIdAndUpdate(booking.serviceId, { $addToSet: { blockedDates: { $each: dateArray } } });
    }

    if (status === 'completed') {
      await Vendor.findByIdAndUpdate(booking.vendorId, { $inc: { totalEarnings: booking.totalAmount } });
    }
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/vendors/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, { upiId: req.body.upiId }, { new: true });
        res.json(vendor);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/settings', async (req, res) => {
  let settings = await AdminSettings.findOne();
  if (!settings) settings = await AdminSettings.create({});
  res.json(settings);
});

app.patch('/api/admin/settings', async (req, res) => {
  const settings = await AdminSettings.findOneAndUpdate({}, req.body, { new: true });
  res.json(settings);
});

app.get('/api/admin/all-data', async (req, res) => {
  try {
      const users = await User.find().lean();
      const bookings = await Booking.find().populate('serviceId vendorId customerId').sort({ createdAt: -1 }).lean();
      const services = await Service.find().populate('vendorId').lean();
      res.json({ users, bookings, services });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(5000, () => console.log('🚀 Master Server active on 5000'));
