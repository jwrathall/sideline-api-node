import { ObjectId } from "mongodb";

export const tenantMiddleware = (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'];
    if(!tenantId){
        return res.status(404).json({message:"tenant Id required"});
    }

    try{
        req.tenantId = new ObjectId(tenantId);
        next();
    }catch(err){
        return res.status(400).json({message:"invalid tenantId"});
    }
}