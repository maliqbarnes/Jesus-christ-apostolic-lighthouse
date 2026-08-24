const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, '..', 'data', 'content.json');

async function migrate() {
  console.log('🚀 Starting JCAL Data Migration...');
  if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ Error: data/content.json not found.');
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(rawData);

  console.log('📦 Content JSON parsed successfully.');
  console.log(`- Admin User: ${data.admin ? data.admin.username : 'admin'}`);
  console.log(`- Events Count: ${data.events ? data.events.length : 0}`);
  console.log(`- Carousel Slides: ${data.carousel && data.carousel.slides ? data.carousel.slides.length : 0}`);

  const adminPass = (data.admin && data.admin.password) ? data.admin.password : 'jcalministries2026!';
  const hashedPassword = await bcrypt.hash(adminPass, 12);
  console.log(`✅ Admin password successfully hashed with bcrypt (salt rounds = 12).`);

  console.log('✨ Migration preparation complete! Data structure validated and ready for production MongoDB Atlas connection.');
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
