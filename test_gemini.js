require('dotenv').config({path: '.env.local'});
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function run() {
  const result = await model.generateContent("I think I have a pain in my eyes");
  console.log(result.response.text());
}
run();
