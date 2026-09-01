const jwt = require("jsonwebtoken");
const axios = require("axios");
const fs = require("fs");

const envFile = fs.readFileSync(__dirname + "/.env", "utf8");
const jwtMatch = envFile.match(/JWTSECRET=([^\n\r]+)/);
const secret = jwtMatch ? jwtMatch[1].trim().replace(/["\x27]/g, "") : "change-this";

const token = jwt.sign({id:"67758f758f2b3b98cbc464b2"}, secret, {expiresIn:"1h"});

axios.get("http://localhost:4000/api/get/getPatients?page=1", {
  headers: {Authorization: "Bearer " + token}
}).then(r => {
  const d = r.data;
  console.log("Patients:", d.patients?.length || 0);
  console.log("Total:", d.pagination?.total);
  console.log("Response:", d.response);
  if (d.patients?.length > 0) console.log("First:", d.patients[0].fullName);
}).catch(e => {
  console.error("Error:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 300));
});
