// ✅ Use v2 imports
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();

exports.resetMonthlyRedemptions = onSchedule(
  {
    schedule: "0 7 1 * *", // 7:00 AM on the 1st of each month
    timeZone: "America/Phoenix",
  },
  async () => {
    const ref = admin.firestore().doc("monthlyRedemptions/currentMonth");

    await ref.set({
      one: 0,
      three: 0,
      five: 0,
      ten: 0,
      twenty: 0,
    });

    console.log("✅ Monthly redemptions reset.");
    return null;
  }
);
