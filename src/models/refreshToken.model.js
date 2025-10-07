module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
      },
      is_revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "refresh_tokens",
      timestamps: true,
      modelName: "RefreshToken",
      underscored: true,
      charset: "utf8",
      collate: "utf8_general_ci",
      engine: "InnoDB",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
  RefreshToken.associate = (db) => {
    RefreshToken.belongsTo(db.User);
  };
  return RefreshToken;
};
