const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Sample data to import
const termsToImport = [
  {
    term: "Algorithm",
    definition: "Step-by-step procedure for solving problems",
    ipa: "/ˈælɡərɪðəm/",
    mandarin: "算法",
    tags: ["computer-science", "programming", "math"]
  },
  {
    term: "API",
    definition: "Application Programming Interface",
    ipa: "/ˌeɪ piː ˈaɪ/",
    mandarin: "应用程序接口",
    tags: ["programming", "web", "development"]
  },
  {
    term: "Database",
    definition: "Structured collection of data",
    ipa: "/ˈdeɪtəbeɪs/",
    mandarin: "数据库",
    tags: ["data", "storage", "programming"]
  },
  {
    term: "Machine Learning",
    definition: "AI technique that enables computers to learn from data",
    ipa: "/məˈʃiːn ˈlɜːrnɪŋ/",
    mandarin: "机器学习",
    tags: ["ai", "programming", "data-science"]
  },
  {
    term: "Blockchain",
    definition: "Distributed ledger technology",
    ipa: "/ˈblɒktʃeɪn/",
    mandarin: "区块链",
    tags: ["cryptocurrency", "technology", "security"]
  }
];

async function importTerms() {
  try {
    console.log('Starting bulk import...');
    
    const batch = db.batch();
    const collectionRef = db.collection('terms');
    
    termsToImport.forEach((term, index) => {
      const docRef = collectionRef.doc();
      const termData = {
        ...term,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      batch.set(docRef, termData);
    });
    
    await batch.commit();
    console.log(`✅ Successfully imported ${termsToImport.length} terms!`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    process.exit();
  }
}

importTerms();
