const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const generateToken = require('../config/generateToken')
const CryptoJS = require("crypto-js");
const axios = require('axios')



const getRecentUsers = asyncHandler(async(req,res)=>{

  try {
    Promise.all([
      User.find({ admin: false }).sort({ createdAt: -1 }).limit(4).exec(),
      User.countDocuments({ admin: false }).exec(),
      User.countDocuments({ admin: true }).exec(),
    ])
    .then(([users, counts, admins]) => {
      return res.status(200).json({ response: true, users, counts, admins });
    })
    .catch(e => {
      return res.status(500).json({ response: false });
    });
  } catch (e) {
    return res.status(500).json({ response: false });
  }
  
  })

const adminLogin = asyncHandler(async(req,res)=>{


    const { email,password } = req.body;
    if(!email || !password)
    {
      res.json({
        response: false,
        msg: "Enter email and password"
      });
    }
    const user = await User.findOne({ email });
    if(user.role == false){
        res.json({
            response: false,
            msg: "User is not admin"
          });
    }
    if(!user)
    {
      res.json({
        response: false,
        msg: "User not found"
      });
    }
    try{
      const bytes  = CryptoJS.AES.decrypt(user.password,  process.env.JWTSECRET)
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if(password != originalText)
      {
        res.json({
          response: false,
          msg: "Wrong Password"
        });
      }
      else{
        res.status(200).json({
          response: true,
          msg:"success",
          token: {
            "access":generateToken(user._id),
          }
        });
      }
  }
    catch(e)
    {
      res.json({response:false,msg:'Network Error'});
    }
  })

const fetchAllDoctors = asyncHandler(async(req,res)=>{
    try{
      const {page} = req.query;
      const totalData = await User.find(
        {admin:'false'}
        ).count();
      const dataPerPage = 10;
  
      const totalPages = Math.ceil(totalData / dataPerPage);
      let currentPage = 1;
  
      if(Number(page) >= 1) currentPage = Number(page);
  
      let offset = (currentPage - 1) * dataPerPage;
      const users = await User.find(
        {admin:'false'}
      ).sort({createdAt:-1}).skip(offset).limit(dataPerPage)
      return res.status(200).send({success:true,users,totalPages})
    }
    catch(e)
    {
        return res.status(200).send({success:false,msg:'Server Error'})
    }
  });

const fetchAllAdmins = asyncHandler(async(req,res)=>{
    try{
      const {page} = req.query;
      const totalData = await User.find({admin:true}).count();
      const dataPerPage = 10;
  
      const totalPages = Math.ceil(totalData / dataPerPage);
      let currentPage = 1;
  
      if(Number(page) >= 1) currentPage = Number(page);
  
      let offset = (currentPage - 1) * dataPerPage;
        const users = await User.find({admin:true}).sort({ createdAt: -1 }).skip(offset).limit(dataPerPage)
        return res.status(200).send({success:true,users,totalPages})
    }
    catch(e)
    {
        return res.status(200).send({success:false,msg:'Server Error'})
    }
  });
  

const createDoctor = asyncHandler(async (req,res)=>{
  
    const { first_name,last_name, email ,password, phone , access , role , address} = req.body;
    if (req.method == "POST") {
      try {
        console.log(username,email,password,phone,address,role,access)
        //-------------------checking input fields-----------------------------------------------
        if(!email  || !username || !password || !access || !role)
        {
          return res.status(200).send({ msg:"Please fill the required fields", success: false });
        }
      
          const isUserExists = await User.findOne({email})
          
          if(isUserExists && isUserExists.email == email) 
          {
            return  res.status(200).send({ msg:"Account already exists", success: false });
          }
          else
          {
            //-------------------checking input fields-----------------------------------------------
            let u = new User({
              username,
              email,
              address,
              phone,
              access,
              role,
              password: CryptoJS.AES.encrypt(
                req.body.password,
                process.env.JWTSECRET
                ).toString(),
              });
               u.save()
              res.status(200).json({ success: true });
            }
  
      } catch {
        res.status(200).json({success:false, error: "You missed something" });
      }
    } else return res.status(200).json({success:false, error: "Bad Request" }); 
  
  
  })

const fecthDemoAccounts = asyncHandler(async(req,res)=>{
    try{
       const { token } = req.body;
       const data = await axios.get(`${process.env.NODE_PUBLIC_URL}/get/fetchUser`,{
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':'application/json'
        }
      })

      if(data.data.response == true)
      {
        return res.status(200).send({success: true , users:data.data.users });
      }else{
        return res.json({success:false,msg:"failed to fetch"})
      }
    }catch(e)
    {
      return res.json({success:false,msg:"failed to fetch"})
    }
})

const createDemoUser = asyncHandler(async(req,res)=>{
  try{
    const { token , email , password , name ,phone } = req.body;
    const formData = {email,password,name,phone_number:phone}
    const data = await axios.post(`${process.env.NODE_PUBLIC_URL}/v1/auth/users/`,formData,{
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type':'application/json'
     }
   })
   if(data.data.response == true)
   {
     return res.status(200).send({success: true , data:data.data.msg });
   }else{
     return res.json({success:false,msg:data.data.msg })
   }
 }catch(e)
 {
   return res.json({success:false,msg:"failed to fetch"})
 }

})

const demoUserCount = asyncHandler(async(req,res)=>{
  try{
    const { token } = req.body;
    const data = await axios.get(`${process.env.NODE_PUBLIC_URL}/get/userCount`,{
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type':'application/json'
     }
   })
   if(data.data.response == true)
   {
    return res.json({success:true,count:data.data.count})
   }else{
    return res.json({success:false})
   }
 }catch(e)
 {
  return res.json({success:false})
 }
})





module.exports = {
    getRecentUsers,
    adminLogin,
    fetchAllDoctors,
    fetchAllAdmins,
    fecthDemoAccounts,
    demoUserCount,
    createDemoUser
 
    
};
