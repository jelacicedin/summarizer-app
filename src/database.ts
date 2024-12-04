import { Sequelize, DataTypes } from 'sequelize';
// Database connection
export const sequelize = new Sequelize('app_db', 'user', 'password', {
    host: 'localhost',
    dialect: 'postgres',
});

// Define models
export const Document = sequelize.define('Document', {
    filename: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    summary: { type: DataTypes.TEXT, defaultValue: null },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// Sync database
sequelize.sync({ alter: true })
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Error syncing database:', err));

