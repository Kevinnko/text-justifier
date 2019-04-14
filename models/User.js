const mongoose = require("mongoose");

// Création du modèle
const User = mongoose.model("User", {
  email: String,
  token: String,
  counter: Number,
  date: String
});

module.exports = User;
