import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("AI Caption request body:", body);
    const { prompt, platforms = ["social media"] } = body;

    // const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const platformList = platforms.length > 0 ? platforms.join(", ") : "general social media";

    const systemPrompt = `You are a social media expert. Generate engaging captions for the following platforms: ${platformList}. 
    Base the captions on this user prompt: "${prompt}".
    Return the captions in a clear format, separated by platform. Use emojis and relevant hashtags.
    Keep platform character limits in mind:
    - Twitter/X: < 280 chars
    - Instagram: < 2200 chars
    - LinkedIn: < 3000 chars
    If multiple platforms are requested, provide distinct versions for each.
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("AI Caption error:", error);
    return NextResponse.json({ error: error.message || "AI generation failed" }, { status: 500 });
  }
}
