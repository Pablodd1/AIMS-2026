const axios = require('axios');

const apiKey = 'YOUR_API_KEY';
const baseUrl = 'https://api.advancemd.com'; // Replace with the actual base URL of AdvanceMD API

async function addPatient(patientData) {
  try {
    const response = await axios.post(
      `${baseUrl}/patients`,
      patientData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Patient added successfully:', response.data);
  } catch (error) {
    console.error('Error adding patient:', error.response ? error.response.data : error.message);
  }
}

const newPatient = {
  firstName: "John",
  lastName: "Doe",
  dateOfBirth: "1990-01-01",
  gender: "M",
  phoneNumber: "123-456-7890",
  email: "john.doe@example.com",
  address: {
    street: "123 Main St",
    city: "Anytown",
    state: "CA",
    zipCode: "12345"
  },
  emergencyContact: {
    name: "Jane Doe",
    relationship: "Spouse",
    phoneNumber: "098-765-4321"
  },
  insurance: {
    provider: "Health Insurance Co.",
    policyNumber: "ABC123456",
    groupNumber: "XYZ7890"
  },
  medicalHistory: {
    primaryCarePhysician: "Dr. Smith",
    medications: ["Medication A", "Medication B"],
    allergies: ["Peanuts", "Penicillin"],
    chronicConditions: ["Diabetes"],
    previousSurgeries: ["Appendectomy"],
    familyMedicalHistory: ["Heart Disease"]
  }
};



async function getAllPatients() {
    let patients = [];
    let page = 1;
    let hasMore = true;
  
    try {
      while (hasMore) {
        const response = await axios.get(
          `${baseUrl}/patients?page=${page}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
  
        patients = patients.concat(response.data.patients); // Adjust based on actual response structure
  
        hasMore = response.data.nextPage ? true : false; // Adjust based on actual response structure
        page++;
      }
  
      console.log('All patients retrieved successfully:', patients);
    } catch (error) {
      console.error('Error retrieving patients:', error.response ? error.response.data : error.message);
    }
  }
  
