const express = require('express');
require('dotenv').config();
const sequelize = require('./config/db'); 


const User = require('./models/User');
const Teacher = require('./models/Teacher');
const School = require('./models/School');


const authRoutes = require('./routes/authRoutes');
const schoolRoutes = require('./routes/schoolRoutes'); 
const teacherRoutes = require('./routes/teacherRoutes');
const transferRoutes = require('./routes/transferRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => res.send('Server is running'));

const PORT = process.env.PORT || 4000;
sequelize.sync({ alter: true }) 
  .then(() => {
    console.log('Database synced successfully');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ Database sync error:', err));
