
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";
const JWT_SECRET = "gramcart_secure_9922";

let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
  } catch (err) {
    console.error("❌ DB Error:", err);
  }
};

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, index: true, sparse: true },
  mobile: { type: String, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  location: { lat: Number, lng: Number }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const VendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessName: { type: String, index: true },
  rating: { type: Number, default: 5 },
  isVerified: { type: Boolean, default: false },
  location: { lat: Number, lng: Number },
  upiId: { type: String, default: '' },
  totalEarnings: { type: Number, default: 0 }
});
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

app.post('/api/login', async (req, res) => {
  await connectDB();
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ 
      $or: [{ email: identifier }, { mobile: identifier }] 
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    let vendorData = null;
    if (user.role === 'vendor') {
      vendorData = await Vendor.findOne({ userId: user._id });
    }
    res.json({ token, user, vendor: vendorData });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post('/api/register', async (req, res) => {
  await connectDB();
  try {
    const { name, email, mobile, password, role, location } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Logic Fix: Ensure email is undefined if blank to satisfy sparse index
    const finalEmail = (email && email.trim() !== "") ? email : undefined;
    
    const user = new User({
      name,
      email: finalEmail,
      mobile,
      password: hashedPassword,
      role: role || 'user',
      location
    });
    await user.save();
    if (user.role === 'vendor') {
      const vendor = new Vendor({ 
        userId: user._id, 
        businessName: `${user.name}'s Shop`,
        location 
      });
      await vendor.save();
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: "Registration failed: Mobile or Email may already exist" });
  }
});

app.get('/api/search', async (req, res) => {
  await connectDB();
  try {
    const vendors = await Vendor.find().lean();
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = app;
