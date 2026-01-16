
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Validación de datos de entrada
  if (!data || data.length === 0) {
    console.error('❌ decodeAudioData: data is empty!');
    throw new Error('Empty audio data');
  }

  console.log(`📦 decodeAudioData: Received ${data.length} bytes`);

  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
  const frameCount = dataInt16.length / numChannels;

  console.log(`🎚️ Creating buffer: ${frameCount} frames, ${numChannels} channels, ${sampleRate}Hz`);

  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  // Verificar que hay datos no-cero
  let hasNonZero = false;
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      const sample = dataInt16[i * numChannels + channel] / 32768.0;
      channelData[i] = sample;
      if (sample !== 0 && !hasNonZero) {
        hasNonZero = true;
      }
    }
  }

  if (!hasNonZero) {
    console.warn('⚠️ Audio buffer contains only zeros (silence)!');
  } else {
    console.log('✅ Audio buffer has non-zero samples');
  }

  return buffer;
}

export function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number = 16000): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    // Simple average (boxcar) for downsampling prevents aliasing better than dropping samples
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export function createPcmBlob(data: Float32Array): string {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values between -1 and 1
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return encodeBase64(new Uint8Array(int16.buffer));
}
