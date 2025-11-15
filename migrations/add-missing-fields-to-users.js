'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем поле phone если его нет
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.phone) {
      await queryInterface.addColumn('users', 'phone', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    
    // Добавляем остальные поля если нужны
    if (!tableInfo.verificationToken) {
      await queryInterface.addColumn('users', 'verificationToken', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    
    if (!tableInfo.resetPasswordToken) {
      await queryInterface.addColumn('users', 'resetPasswordToken', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    
    if (!tableInfo.resetPasswordExpires) {
      await queryInterface.addColumn('users', 'resetPasswordExpires', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Откат миграции - удаляем добавленные поля
    await queryInterface.removeColumn('users', 'phone');
    await queryInterface.removeColumn('users', 'verificationToken');
    await queryInterface.removeColumn('users', 'resetPasswordToken');
    await queryInterface.removeColumn('users', 'resetPasswordExpires');
  }
};