import dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log("🔍 Checking Google servers for your allowed models...");
    
    // Ping Google directly using your API key
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.error) {
        console.error("❌ API Key Error:", data.error.message);
        return;
    }

    // Filter the massive list down to just the Gemini text models
    const geminiModels = data.models
        .map(m => m.name.replace('models/', ''))
        .filter(name => name.includes('gemini'));
        
    console.log("\n✅ SUCCESS! Your API key is authorized for these exact models:\n");
    console.log(geminiModels);
    console.log("\n👉 Find 'gemini-1.5-flash' (or similar like 'gemini-1.5-flash-002') in this list and copy it!");
}

run();