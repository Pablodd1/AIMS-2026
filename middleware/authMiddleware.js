const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      
      //decodes token id
      const decoded = jwt.verify(token, process.env.JWTSECRET);
      req.user = decoded.id

      next();
    } catch (error) {
      res.status(200).json({success:false,msg:"Token-Session-Ended"});
    }
  }

  if (!token) {
    res.status(200).json({success:false,msg:"Token-Session-Ended"});
    
  }
});

module.exports = { protect };
