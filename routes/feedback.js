// backend/routes/feedback.js
const express = require('express');
const router = express.Router();
const { readCsv, writeCsv } = require('../utils/csvHandler');
const { v4: uuidv4 } = require('uuid');

const FEEDBACK_FILE = 'feedback.csv';
const VOTES_FILE = 'votes.csv'; // New: Constant for the votes file

// POST /feedback – Add new feedback
router.post('/', async (req, res) => {
  // We now expect userId from the frontend to link feedback to the user
  const { name, email, message, userId } = req.body;

  if (!name || !email || !message || !userId) {
    // Ensure userId is provided along with other fields
    return res.status(400).json({ error: 'All fields (name, email, message, userId) are required' });
  }

  const feedback = await readCsv(FEEDBACK_FILE);

  const newFeedback = {
    id: uuidv4(),
    name,
    email,
    message,
    votes: "0", // stored as string for CSV
    id_user: userId // Store the ID of the user who submitted this feedback
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

// PUT /feedback/:id/vote – Upvote or downvote with single vote restriction
router.put('/:id/vote', async (req, res) => {
  const { id } = req.params; // Feedback ID
  const { vote, userId } = req.body; // Expected: "up" or "down", and the user ID

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required for voting' });
  }
  if (vote !== 'up' && vote !== 'down') {
    return res.status(400).json({ error: 'Vote type must be "up" or "down"' });
  }

  const allFeedbacks = await readCsv(FEEDBACK_FILE);
  const feedbackIndex = allFeedbacks.findIndex(item => item.id === id);

  if (feedbackIndex === -1) {
    return res.status(404).json({ error: 'Feedback not found' });
  }

  // --- Single vote restriction logic ---
  let allVotes = await readCsv(VOTES_FILE);
  const existingVoteIndex = allVotes.findIndex(v => v.feedback_id === id && v.user_id === userId);

  let currentFeedbackVotes = parseInt(allFeedbacks[feedbackIndex].votes);

  if (existingVoteIndex !== -1) {
    const existingVote = allVotes[existingVoteIndex];
    if (existingVote.vote_type === vote) {
        // User is trying to cast the same vote type again
        return res.status(409).json({ error: `You have already ${vote === 'up' ? 'upvoted' : 'downvoted'} this feedback.` });
    } else {
        // User is changing their vote (e.g., from up to down, or vice versa)
        // Revert the old vote
        if (existingVote.vote_type === 'up') {
            currentFeedbackVotes--;
        } else if (existingVote.vote_type === 'down') {
            currentFeedbackVotes++;
        }
        // Update the existing vote record to the new vote type
        allVotes[existingVoteIndex].vote_type = vote;
    }
  } else {
    // No existing vote from this user for this feedback
    // Add a new vote record
    const newVoteRecord = {
      id: uuidv4(),
      feedback_id: id,
      user_id: userId,
      vote_type: vote
    };
    allVotes.push(newVoteRecord);
  }

  // Apply the new vote effect
  if (vote === 'up') {
    currentFeedbackVotes++;
  } else { // vote === 'down'
    currentFeedbackVotes--;
  }
  allFeedbacks[feedbackIndex].votes = currentFeedbackVotes.toString();

  await writeCsv(VOTES_FILE, allVotes); // Save updated vote records
  await writeCsv(FEEDBACK_FILE, allFeedbacks); // Save updated feedback counts

  res.json(allFeedbacks[feedbackIndex]);
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

  // Also remove associated vote records when feedback is deleted
  let allVotes = await readCsv(VOTES_FILE);
  allVotes = allVotes.filter(vote => vote.feedback_id !== id);
  await writeCsv(VOTES_FILE, allVotes);

  await writeCsv(FEEDBACK_FILE, feedback);
  res.status(204).end();
});

module.exports = router;