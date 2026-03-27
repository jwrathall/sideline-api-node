// backend/auth.js
import passport from "passport";
import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from 'passport-local';
import db from "./db/connection.js";
// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

const auth = () => { // Pass the express app instance
    passport.use(new LocalStrategy(
        { usernameField: 'email' },
        async (email, password, done) => {
            try {
                console.log('Attempting login for email:', email); // Check the email
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
    
                if (!userWithRole || userWithRole.length === 0) {
                    console.log('User not found'); // Check if user is found
                    return done(null, false, { message: 'No user with that email' });
                }  
    
                const user = userWithRole[0];
                console.log("user", user)
    
                const isMatch = await bcrypt.compare(password, user.password);
                console.log('Password match:', isMatch); // Check the comparison result

                if (isMatch) {
                    console.log("login success")
                    const { password: _pw, ...userWithoutPassword } = user;
                    return done(null, userWithoutPassword); // success
                }


                return done(null, false, { message: 'Password incorrect' }); // Failure
            } catch (err) {
                console.error('Error during authentication:', err); // Check for errors
                return done(err);
            }
        }
    ));

    passport.serializeUser((user, done) => {
        //console.log("user in serialize", user) //check user object
        if (!user || !user._id) {
            //console.error("User object or _id is missing!");
            return done(new Error("User object or _id is missing!")); // Handle the error
        }
        done(null, user._id.toString());
    });

    // passport.deserializeUser(async (id, done) => {
    //     try {
    //         const user = await db.collection('User').findOne({ _id: new ObjectId(id) }); // Using MongoDB driver's findOne
    //         if (!user) {
    //             return done(null, false); // User not found
    //         }
    //         done(null, user); // Pass the full user object to Passport
    //     } catch (err) {
    //         return done(err); // Handle errors
    //     }
    // });

    passport.deserializeUser(async (id, done) => {
        //console.log("🔄 Deserializing user with ID:", id);
    
        if (!id) {
            //console.error("❌ No ID found in session");
            return done(null, false);
        }
    
        try {
            //const user = await db.collection('User').findOne({ _id: new ObjectId(id) });
            const users = await db.collection('User').aggregate([
                { $match: { _id: new ObjectId(id) } },
                {
                    $lookup: {
                        from: "Role",
                        localField: "role",
                        foreignField: "_id",
                        as: "role"
                    }
                }
            ]).toArray();

            if (!users || users.length === 0) {
                return done(null, false);
            }

            const { password, ...userWithoutPassword } = users[0];
            done(null, userWithoutPassword);
        } catch (err) {
            //console.error("❌ Error during deserialization:", err);
            done(err);
        }
    });
    


};
export const isAuthenticated = (req, res, next) => {
    //console.log(req)
    if (req.isAuthenticated()) {
        return next(); // User is authenticated, proceed to the next middleware/route handler
    }
    // User is not authenticated
    res.status(401).json({ message: 'Unauthorized' }); // Or redirect to login page: res.redirect('/login');
};
export const isNotAuthenticated = (req, res, next) => {
    console.log(req)
    if (!req.isAuthenticated()) {
        return next(); // User is not authenticated, proceed to the next middleware/route handler
    }
    // User is authenticated
    res.status(401).json({ message: 'Already logged in' }); // Or redirect to home page: res.redirect('/');
};

export default auth;
