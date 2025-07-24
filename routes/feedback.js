const express = require('express');
const router = express.Router();
const { readCsv, writeCsv } = require('../utils/csvHandler');
const { v4: uuidv4 } = require('uuid');

const FEEDBACK_FILE = 'feedback.csv';

// POST /feedback – Add new feedback
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const feedback = await readCsv(FEEDBACK_FILE);

  const newFeedback = {
    id: uuidv4(),
    name,
    email,
    message,
    votes: "0" // stored as string for CSV
  };

  feedback.push(newFeedback);
  await writeCsv(FEEDBACK_FILE, feedback);

  res.status(201).json(newFeedback);
});

// GET /feedback – Retrieve all feedback
router.get('/', async (req, res) => {
  const feedback = await readCsv(FEEDBACK_FILE);
  res.json(feedback);
});

// PUT /feedback/:id/vote – Upvote or downvote
router.put('/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { vote } = req.body; // expected: "up" or "down"

  const feedback = await readCsv(FEEDBACK_FILE);
  const index = feedback.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Feedback not found' });
  }

  let votes = parseInt(feedback[index].votes);
  votes = vote === 'up' ? votes + 1 : vote === 'down' ? votes - 1 : votes;
  feedback[index].votes = votes.toString();

  await writeCsv(FEEDBACK_FILE, feedback);
  res.json(feedback[index]);
});

// DELETE /feedback/:id – Delete feedback
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  let feedback = await readCsv(FEEDBACK_FILE);
  const initialLength = feedback.length;

  feedback = feedback.filter(item => item.id !== id);

  if (feedback.length === initialLength) {
    return res.status(404).json({ error: 'Feedback not found' });
  }

  await writeCsv(FEEDBACK_FILE, feedback);
  res.status(204).end();
});

module.exports = router;
