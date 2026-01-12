
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// Connection string direct yahan daal di hai taaki aapko mehnat na karni pade
const MONGO_URI = "mongodb+srv://biyahdaan_db_user:cUzpl0anIuBNuXb9@cluster0.hf1vhp3.mongodb.net/gramcart_db?retryWrites=true&w=majority";

// MongoDB Connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ DB Error:", err);
  }
};

// Schemas
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
}));

const Booking = mongoose.models.Booking || mongoose.model('Booking', new mongoose.Schema({
  userId: String,
  vendorName: String,
  amount: Number,
  otp: String,
  date: { type: Date, default: Date.now }
}));

// API Routes
app.post('/api/login', async (req, res) => {
  await connectDB();
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    const token = jwt.sign({ id: user._id }, 'SECRET');
    res.json({ token, user });
  } else {
    res.status(401).json({ error: "Invalid login" });
  }
});

app.post('/api/register', async (req, res) => {
  await connectDB();
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

module.exports = app;
