const { Sequelize, DataTypes } = require('sequelize');
// Database connection
const sequelize = new Sequelize('app_db', 'user', 'password', {
    host: 'localhost',
    dialect: 'postgres',
});

// Define models
const Document = sequelize.define('Document', {
    filename: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    summary: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
});

// Sync database
sequelize.sync({ alter: true })
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Error syncing database:', err));

module.exports = { sequelize, Document };
