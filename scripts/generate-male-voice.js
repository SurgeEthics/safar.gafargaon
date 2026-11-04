import { EdgeTTS } from 'node-edge-tts';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('Generating authentic Bengali male driver voice with EdgeTTS (bn-BD-PradeepNeural)...');
  const tts = new EdgeTTS({ voice: 'bn-BD-PradeepNeural' });
  const text = 'সফর অ্যাপের সম্মানিত চালক, আপনার একটি নতুন যাত্রার অনুরোধ এসেছে।';
  const rawPath = path.resolve('public/driver_voice_male_raw.mp3');
  const finalPath = path.resolve('public/driver_voice_male.mp3');

  await tts.ttsPromise(text, rawPath);
  console.log('Raw audio generated successfully.');

  // Normalize, volume master and convert to high quality 128k MP3
  execSync(`ffmpeg -y -i "${rawPath}" -filter:a "volume=1.8,loudnorm=I=-14:TP=-1.0:LRA=7" -b:a 128k "${finalPath}"`);
  if (fs.existsSync(rawPath)) {
    fs.unlinkSync(rawPath);
  }
  console.log('Final loud authentic male audio saved to:', finalPath);
}

main().catch(err => {
  console.error('Failed to generate male voice:', err);
  process.exit(1);
});
