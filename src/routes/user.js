import express from "express";

// This will help us connect to the database
import db from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";


// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const router = express.Router();

router.get('/current',  (req, res) => {
  if (req.isAuthenticated()) {
   res.json({
     user: req.user, // This contains user details stored in session
     isAuthenticated: true
   });
 } else {
   res.status(401).json({ message: 'Not authenticated', isAuthenticated: false });
 }
});

// get all users
router.get("/", async (req,res) =>{
  let collection = await db.collection("User")
  let results = await collection.aggregate([
    {
      $lookup: {
        from: "Role", // The name of the referenced collection
        localField: "role", // Field in 'Teams' with the reference(s)
        foreignField: "_id", // Field in 'Players' that matches the reference
        as: "role" // Alias for the joined documents
      }
    }
  ]).toArray();
  res.send(results).status(200);
});


// get single user
router.get("/:id", async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  let collection = await db.collection("User");
  //let result = await collection.findOne(query);
  let result = await collection.aggregate([
    {
      $match: query // Filter for the specific user by ID
    },
    {
      $lookup: {
        from: "Role", // The name of the referenced collection
        localField: "role", // Field in 'Users' with the reference(s)
        foreignField: "_id", // Field in 'Role' that matches the reference
        as: "role" // Alias for the joined documents (array of roles)
      }
    }
  ]).toArray();

  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});

// create a new record.
router.post("/", async (req, res) => {
  try {
    let newDocument = {
      createdAt:new Date(),
      email:req.body.email,
      name: req.body.name,
      password: req.body.password,
      isCaptain: req.body.isCaptain
    };
    let collection = await db.collection("User");
    let result = await collection.insertOne(newDocument);
    res.send(result).status(204);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding record");
  }
});

// update a record by id.
router.patch("/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
        createdAt:new Date(),
      },
    };

    let collection = await db.collection("User");
    let result = await collection.updateOne(query, updates);
    res.send(result).status(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating record");
  }
});

// delete a record
router.delete("/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };

    const collection = db.collection("User");
    let result = await collection.deleteOne(query);

    res.send(result).status(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting record");
  }
});



//* Original Mongo tutorial  */
// // This section will help you get a list of all the records.
// router.get("/", async (req, res) => {
//   let collection = await db.collection("records");
//   let results = await collection.find({}).toArray();
//   res.send(results).status(200);
// });

// // This section will help you get a single record by id
// router.get("/:id", async (req, res) => {
//   let collection = await db.collection("records");
//   let query = { _id: new ObjectId(req.params.id) };
//   let result = await collection.findOne(query);

//   if (!result) res.send("Not found").status(404);
//   else res.send(result).status(200);
// });

// // This section will help you create a new record.
// router.post("/", async (req, res) => {
//   try {
//     let newDocument = {
//       name: req.body.name,
//       position: req.body.position,
//       level: req.body.level,
//     };
//     let collection = await db.collection("records");
//     let result = await collection.insertOne(newDocument);
//     res.send(result).status(204);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error adding record");
//   }
// });

// This section will help you update a record by id.
// router.patch("/:id", async (req, res) => {
//   try {
//     const query = { _id: new ObjectId(req.params.id) };
//     const updates = {
//       $set: {
//         name: req.body.name,
//         position: req.body.position,
//         level: req.body.level,
//       },
//     };

//     let collection = await db.collection("records");
//     let result = await collection.updateOne(query, updates);
//     res.send(result).status(200);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error updating record");
//   }
// });

// // This section will help you delete a record
// router.delete("/:id", async (req, res) => {
//   try {
//     const query = { _id: new ObjectId(req.params.id) };

//     const collection = db.collection("records");
//     let result = await collection.deleteOne(query);

//     res.send(result).status(200);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error deleting record");
//   }
// });

export default router;
