import express from "express";

// This will help us connect to the database
import db from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

const router = express.Router();


router.post('/lookup', async (req, res) => {
    try {
        const { tenantIds } = req.body;
        
        const tenants = await findTenantsByIds(tenantIds);

        // Check if we found all requested tenants
        if (tenants.length !== tenantIds.length) {
            const foundIds = tenants.map(tenant => tenant._id.toString());
            const missingIds = tenantIds.filter(id => 
                !foundIds.includes(id.toString())
            );
            
            // Still return the data, but with a warning
            return res.status(206).json({
                tenants,
                warning: 'Some tenants were not found',
                missingIds
            });
        }

        res.json({
            tenants
        });
    } catch (error) {
        console.error('Error in tenant lookup endpoint:', error);
        res.status(500).json({
            error: 'Internal server error while looking up tenants'
        });
    }
});



async function findTenantsByIds(tenantIds) {
    try {
        // Convert string IDs to ObjectId if needed
        const objectIds = tenantIds.map(id => 
            id instanceof ObjectId ? id : new ObjectId(id)
        );

        // Query the Tenant collection using $in operator
        const tenants = await db.collection('Tenant').find({
            _id: { $in: objectIds }
        }).toArray();

        return tenants;
    } catch (error) {
        console.error('Error finding tenants:', error);
        throw error;
    }
}


export default router;
