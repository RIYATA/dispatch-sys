import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
 const nets = os.networkInterfaces();
 const results: string[] = [];

 for (const name of Object.keys(nets)) {
  for (const net of nets[name] || []) {
   // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
   // 'IPv4' is in Node <= 17, from 18 it's a number 4 or string "IPv4"
   const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
   if (net.family === familyV4Value && !net.internal) {
    results.push(net.address);
   }
  }
 }

 // Prefer 192.168.x.x or 10.x.x.x
 const ip = results.find(ip => ip.startsWith('192.168.')) || results[0] || '127.0.0.1';

 return NextResponse.json({ ip });
}
