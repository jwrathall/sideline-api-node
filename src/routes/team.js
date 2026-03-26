import express from "express";

// This will help us connect to the database
import db from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const router = express.Router();

router.get("/", async (req,res) =>{
  let collection = await db.collection("Teams")
  const results = await collection.aggregate([
    {
      $lookup: {
        from: "Users", // The name of the referenced collection
        localField: "captain", // Field in 'Teams' with the reference(s)
        foreignField: "_id", // Field in 'Players' that matches the reference
        as: "captain" // Alias for the joined documents
      }
    },
    {
        $lookup: {
          from: "Users", // Collection for members
          localField: "members", // Field in Teams containing member ObjectIds
          foreignField: "_id", // Field in Users matching the ObjectIds
          as: "members" // Alias for the joined members
        }
      }
  ]).toArray();

  res.send(results).status(200);
});

export default router;


