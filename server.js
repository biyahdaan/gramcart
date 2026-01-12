
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// Aapki provided Connection String
const MONGO_URI = "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";

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
  name: String,
  category: String,
  price: Number,
  image: String,
  verified: Boolean,
  description: String,
  location: { lat: Number, lng: Number }
});

const BookingSchema = new mongoose.Schema({
  userId: String,
  vendorId: String,
  vendorName: String,
  amount: Number,
  otp: String,
  status: { type: String, default: 'confirmed' },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Vendor = mongoose.model('Vendor', VendorSchema);
const Booking = mongoose.model('Booking', BookingSchema);

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = jwt.sign({ id: user._id }, 'GRAM_SECRET_KEY');
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    const token = jwt.sign({ id: user._id }, 'GRAM_SECRET_KEY');
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } else {
    res.status(401).json({ error: "Invalid Credentials" });
  }
});

app.get('/api/vendors', async (req, res) => {
  const vendors = await Vendor.find();
  res.json(vendors);
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));
