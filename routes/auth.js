// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { readCsv, writeCsv } = require('../utils/csvHandler');
const { v4: uuidv4 } = require('uuid');

const USERS_FILE = 'users.csv';

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  const users = await readCsv(USERS_FILE);

  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const newUser = {
    id: uuidv4(),
    name,
    email,
    password // plaintext (for this example, in real apps use hashed passwords)
  };

  users.push(newUser);
  await writeCsv(USERS_FILE, users);

  res.status(201).json({
    message: 'Signup successful',
    userId: newUser.id,
    name: newUser.name, // <--- ADD THIS LINE
    email: newUser.email // <--- ADD THIS LINE
  });
});

// POST /auth/login (already correct)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const users = await readCsv(USERS_FILE);
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({ message: 'Login successful', userId: user.id, name: user.name, email: user.email});
});

module.exports = router;