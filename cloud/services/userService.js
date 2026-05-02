class UserService {
  /**
   * Clear notification badges for user.
   */
  async clearNotifications(user) {
    if (!user) {
      throw new Parse.Error(
        Parse.Error.INVALID_SESSION_TOKEN,
        "Not authenticated.",
      );
    }
    // Store the current timestamp so getNotificationCount only counts
    // orders updated after this point
    user.set("lastNotificationCheck", new Date().toISOString());
    await user.save(null, { useMasterKey: true });
    return { cleared: 1 };
  }
}

module.exports = new UserService();
