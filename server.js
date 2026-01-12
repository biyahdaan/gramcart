
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// CORS configuration to allow your frontend to communicate with this backend
app.use(cors({
  origin: '*', // For production, you can replace '*' with your specific frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
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

const User = mongoose.model('User', UserSchema);

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: "GramCart Server is LIVE 🚀",
    database: mongoose.connection.readyState === 1 ? "Connected ✅" : "Disconnected ❌",
    endpoints: {
      auth: "/api/login, /api/register"
    }
  });
});

// Auth Routes
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
