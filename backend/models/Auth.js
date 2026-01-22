class Auth {
  constructor({ userId, refreshToken, createdAt }) {
    this.userId = userId;
    this.refreshToken = refreshToken;
    this.createdAt = createdAt;
  }
}

module.exports = Auth;
