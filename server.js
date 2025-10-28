const express = require('express');
const path = require('path');
const cors = require('cors');
const sequelize = require('./config/db'); // Sequelize instance

// Routes
const authRoutes = require('./routes/authRoutes');
const schoolRoutes = require('./routes/schoolRoutes'); 
const teacherRoutes = require('./routes/teacherRoutes');
const transferRoutes = require('./routes/transferRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const statsRoutes = require("./routes/statsRoutes");

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/stats", statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/notifications', notificationRoutes);

// Test route
app.get('/', (req, res) => res.send('Server is running'));

// Start server after syncing DB
const PORT = 4000;
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced successfully');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Database sync error:', err));
