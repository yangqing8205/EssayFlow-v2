import OpenAI from "openai";
export interface LLMProvider{generate<T>(system:string,input:unknown):Promise<T>}
export class OpenAICompatibleProvider implements LLMProvider{private client:OpenAI;private model:string;constructor(){this.client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,baseURL:process.env.OPENAI_BASE_URL});this.model=process.env.OPENAI_MODEL||"gpt-4.1-mini"}async generate<T>(system:string,input:unknown){const r=await this.client.chat.completions.create({model:this.model,response_format:{type:"json_object"},messages:[{role:"system",content:system},{role:"user",content:JSON.stringify(input)}]});return JSON.parse(r.choices[0].message.content||"{}") as T}}
export function providerMode(){return process.env.OPENAI_API_KEY?"live":"mock" as const}
