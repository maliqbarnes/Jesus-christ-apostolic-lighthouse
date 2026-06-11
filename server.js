const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Serve the main site for the homepage and any simple route fallback.
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'variant.html'));
});

app.listen(PORT, () => {
  console.log(`JCAL demo running at http://localhost:${PORT}`);
});
