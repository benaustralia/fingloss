// Add this to your App.jsx temporarily for web-based import
const sampleData = [
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

// Function to import sample data
async function importSampleData() {
  try {
    for (const termData of sampleData) {
      await glossaryService.addTerm(termData);
      console.log(`Imported: ${termData.term}`);
    }
    console.log('✅ All terms imported successfully!');
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

// Call this function in browser console: importSampleData()
