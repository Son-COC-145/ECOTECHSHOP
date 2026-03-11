class User {
  constructor({ userId, username, email, phone, password, role, createdAt, updatedAt, isDeleted, deletedAt }) {
    this.userId = userId;
    this.username = username;
    this.email = email;
    this.phone = phone;
    this.password = password;
    this.role = role;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.isDeleted = isDeleted ?? false;
    this.deletedAt = deletedAt ?? null;
  }
}

module.exports = User;
