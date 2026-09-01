const jwt = require("jsonwebtoken");
const axios = require("axios");
const fs = require("fs");

// Read .env
const env = fs.readFileSync(".env", "utf8");
const jwtMatch = env.match(/JWTSECRET=([^\n\r]+)/);
const secret = jwtMatch ? jwtMatch[1].trim().replace(/["\x27]/g, "") : "change-this";

const token = jwt.sign({id:"67758f758f2b3b98cbc464b2"}, secret, {expiresIn:"1h"});
const headers = {Authorization: "Bearer " + token};

async function test() {
  // Test 1: checkUserToken
  console.log("=== checkUserToken ===");
  try {
    const r1 = await axios.post("http://localhost:4000/api/post/checkUserToken", {}, {headers, timeout: 5000});
    console.log("Status:", r1.status);
    console.log("Data:", JSON.stringify(r1.data));
  } catch(e) {
    console.log("Error:", e.response?.status, e.response?.data?.msg || e.message);
  }
  
  // Test 2: getPatients
  console.log("\n=== getPatients ===");
  try {
    const r2 = await axios.get("http://localhost:4000/api/get/getPatients", {headers, timeout: 5000});
    console.log("Status:", r2.status);
    console.log("Patients count:", r2.data.patients?.length);
    console.log("Total:", r2.data.pagination?.total);
  } catch(e) {
    console.log("Error:", e.response?.status, e.response?.data?.msg || e.message);
  }
}
test();
