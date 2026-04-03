import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import cors from "cors";
import passport from 'passport';
import users from "./routes/user.js";
import team from "./routes/team.js";
import tenant from "./routes/tenant.js"
import events from "./routes/event.js";
import auth from "./auth.js";
import db from "./db/connection.js";
import 'dotenv/config';
// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

const PORT  = process.env.PORT || 5050
const app = express();

app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, 
    cookie:{secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24}
    // cookie: {
    //     secure: process.env.NODE_ENV === 'production',
    //     httpOnly: true,
    //     maxAge: 1000 * 60 * 60 * 24
    // }
}));
auth();
app.use(passport.initialize());
app.use(passport.session());

app.use("/user", users);
app.use("/team", team);
app.use("/tenant", tenant);
app.use("/event", events);
app.listen(PORT, () => { console.log(`Server listening to port ${PORT}`)});

auth(); 
// could move back to users once testing is complete
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
        const query = { email };

        const userWithRole = await db.collection('User').aggregate([
            { $match: query },
            {
              $lookup: {
                from: "Role",
                localField: "role",
                foreignField: "_id",
                as: "role"
              }
            },
            { $unwind: "$role" } // Important: unwind the role array
          ]).toArray();

      if (userWithRole[0]) return res.status(400).send('User already exists');

        let newDocument = {
            createdAt:new Date(),
            email: email,
            name: req.body.name,
            password: hashedPassword,
            isCaptain: req.body.isCaptain,
            // TODO: make dynamic
            tenantId:new ObjectId('67735f0807555099312d6335'),
            role:[ new ObjectId('6777500605c03a5c5e24ba63')]
        };
        let collection = await db.collection("User");
        await collection.insertOne(newDocument);

      res.status(201).send('User Registered');
    } catch (error) {
      res.status(500).send('Error registering user');
    }
  });

  app.post('/login', passport.authenticate('local'), (req, res) => {
    if (req.user) {
        req.login(req.user, (err) => {
            if (err) {
                //console.error("Error in req.login:", err);
                return res.status(500).json({ message: "Login failed" });
            }
            //console.log("Session after login:", req.session);
            return res.json({ message: "Login successful", user: req.user });
        });
    } else {
        return res.status(401).json({ message: "Invalid credentials" });
    }
});

  app.get('/profile', (req, res) => {
    if (req.isAuthenticated()) {
      res.send(`Welcome, ${req.user.username}`);
    } else {
      res.status(401).send('Not authenticated');
    }
  });

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.json({ message: 'Logout successful' });
    });
});

