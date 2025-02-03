const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserModelSchema = new Schema({
  id: Number,
  name: String,
  zipcode: Number,
  latitude: Number,
  longitude: Number,
  timezone: String,
});

const UserModel = mongoose.model("UserModel", UserModelSchema);

module.exports = UserModel;
