// scripts/seed.js

// This script initializes the database with the first approved journalist.
// It's designed to be run during a CI/CD process like Vercel's build step.

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc } = require('firebase/firestore');

// Read Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
};

async function seedDatabase() {
  if (!firebaseConfig.projectId) {
    console.log("Firebase project ID not found in environment variables. Skipping seed.");
    return;
  }

  console.log(`Initializing connection to Firebase project: ${firebaseConfig.projectId}`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const applicationsRef = collection(db, 'applications');

  try {
    const snapshot = await getDocs(applicationsRef);

    if (snapshot.empty) {
      console.log('"applications" collection is empty. Seeding initial admin user...');
      
      const adminUser = {
        id: 'j-admin-01',
        name: 'Admin Journalist',
        affiliation: 'Chimera Core',
        reason: 'Initial community member.',
        status: 'approved',
        approvals: 10,
        votedBy: [],
        denialReason: ''
      };

      await addDoc(applicationsRef, adminUser);
      console.log('Successfully seeded the database with the admin user.');
    } else {
      console.log('"applications" collection already exists. No seeding necessary.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    // Exit with an error code to potentially fail the build if seeding is critical
    process.exit(1);
  }
}

seedDatabase().then(() => {
  console.log('Database seeding process finished.');
  process.exit(0);
});
