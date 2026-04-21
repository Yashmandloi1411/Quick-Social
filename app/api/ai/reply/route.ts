import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { comment, username, prompt, tone = "friendly" } = body;

    if (!comment) {
      return NextResponse.json({ error: "Missing comment" }, { status: 400 });
    }

    // const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const systemPrompt = `You are a social media manager writing replies to comments.

Tone: ${tone}
${prompt ? `Additional instructions: ${prompt}` : ""}

Comment from ${username || "a user"}: "${comment}"

Write a single, natural reply to this comment. Keep it concise (1-3 sentences). 
Do NOT include quotes around your reply. Just write the reply text directly.`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().trim();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("AI reply error:", error);
    return NextResponse.json({ error: error.message || "AI generation failed" }, { status: 500 });
  }
}
