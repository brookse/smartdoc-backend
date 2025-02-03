/*
Task name: User endpoints

Requirements
  1.  We need to create CRUD endpoints
  2.  The entries (users) can just be saved in a noSQL database (Bonus for using Firebase Realtime Database)
  3.  Each user should have the following data entries: 
        id, name, zip code, latitude, longitude, timezone
  4.  When creating a user, allow input for name and zip code.  
      (Fetch the latitude, longitude, and timezone - Documentation: https://openweathermap.org/current) 
      (You will need to generate an API Key)
  5.  When updating a user, Re-fetch the latitude, longitude, and timezone (if zip code changes)
  6.  Connect to a ReactJS front-end
  * feel free to add add something creative you'd like

*/
require("dotenv").config();

const UserModel = require("./UserModel");

const axios = require("axios");
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const app = express();
app.use(cors());
app.use(express.json())

// Create a MongoClient and connect to db
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoDB = process.env.MONGO_DB;
const client = new MongoClient(mongoDB, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function connectToDB() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
connectToDB().catch(console.dir);
mongoose.connect(mongoDB);

const openWeatherKey = process.env.OPEN_WEATHER_KEY;
// Gets lat, lng, and tz based on zipcode.
async function getLocationData(zipcode) {
  const geocodeUrl = `https://api.openweathermap.org/geo/1.0/zip?zip=${zipcode}&appid=${openWeatherKey}`;
  const geocodeResponse = await axios.get(geocodeUrl);
  if (geocodeResponse.data) {
    const exclusions = "current,minutely,hourly,daily,alerts";
    const timezoneUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${geocodeResponse.data.lat}&lon=${geocodeResponse.data.lon}&exclude=${exclusions}&appid=${openWeatherKey}`;
    const timezoneResponse = await axios.get(timezoneUrl);

    if (timezoneResponse.data)
      return {
        latitude: geocodeResponse.data.lat,
        longitude: geocodeResponse.data.lon,
        timezone: timezoneResponse.data.timezone,
      };
  }
}

app.get("/", (req, res) => {
  console.log('triggering  "/" endpoint...');

  // define company name
  let companyName = "SMART";
  console.log("companyName = ", companyName);

  // send response
  res.send(`Welcome to the ${companyName} interview!`);
});

// Returns an array of all users.
app.get("/users", async (req, res) => {
  const users = await UserModel.find().exec();
  if (users) {
    res.status(200).json(users);
  } else {
    res.status(404).json({ error: "Users not found" });
  }
});

// Returns a single user's details.
app.get("/users/:id", async (req, res) => {
  const user = await UserModel.findById(req.params.id).exec();
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Creates a new user, fetching the lat, lng, and tz.
app.post("/users", async (req, res) => {
  const { name, zipcode } = req.body;

  if (!name && !zipcode)
    return res.status(400).json({ error: "Name and zipcode are required." });
  if (!name) return res.status(400).json({ error: "Name is required." });
  if (!zipcode) return res.status(400).json({ error: "Zipcode is required." });

  const zipValid = /^\d{5}(-\d{4})?$/.test(zipcode);
  if (!zipValid)
    return res.status(400).json({ error: "Zipcode format is not valid." });

  let params = {
    name: name,
    zipcode: zipcode,
  };

  const locationData = await getLocationData(zipcode);
  params = { ...params, latitude: locationData.latitude, longitude: locationData.longitude, timezone: locationData.timezone };

  try {
    await UserModel.create(params);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: `Error creating user: ${error}` });
  }
});

// Edits a user. If the zipcode changes, refetches the lat, lng, and tz.
app.put("/users/:id", async (req, res) => {
  const { name, zipcode } = req.body;
  if (!name && !zipcode)
    return res.status(400).json({ error: "Name and zipcode are required." });
  if (!name) return res.status(400).json({ error: "Name is required." });
  if (!zipcode) return res.status(400).json({ error: "Zipcode is required." });

  const zipValid = /^\d{5}(-\d{4})?$/.test(zipcode);
  if (!zipValid)
    return res.status(400).json({ error: "Zipcode format is not valid." });

  const user = await UserModel.findById(req.params.id).exec();
  let updatedParams = {
    name: name,
    zipcode: zipcode,
  };

  if (user.zipcode !== zipcode) {
    const locationData = await getLocationData(zipcode);
    updatedParams = { ...updatedParams, latitude: locationData.latitude, longitude: locationData.longitude, timezone: locationData.timezone };
  }

  try {
    const updated = await UserModel.findByIdAndUpdate(
      req.params.id,
      updatedParams
    );
    if (updated) {
      res.status(200).json(updated);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: `Error updating user: ${error}` });
  }
});

// Deletes a user.
app.delete("/users/:id", async (req, res) => {
  try {
    const deleted = await UserModel.findByIdAndDelete(req.params.id);
    if (deleted) {
      res.status(200).json("User deleted");
    } else {
      res.status(404).json("User not found");
    }
  } catch (error) {
    res.status(500).json({ error: `Error deleting user: ${error}` });
  }
});

app.listen(8080);
