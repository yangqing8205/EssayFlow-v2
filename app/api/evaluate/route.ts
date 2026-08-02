import {NextResponse} from "next/server";import {ParsedEssaySchema} from "@/lib/schemas";import {runWorkflow} from "@/lib/workflow/run";
export async function POST(req:Request){try{const parsed=ParsedEssaySchema.parse(await req.json());return NextResponse.json(await runWorkflow(parsed))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"评测失败"},{status:400})}}
