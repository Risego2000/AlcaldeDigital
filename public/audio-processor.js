class AudioPCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._bufferSize = 4096;
        this._buffer = new Float32Array(this._bufferSize);
        this._ptr = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input[0]) {
            const channelData = input[0];

            for (let i = 0; i < channelData.length; i++) {
                this._buffer[this._ptr++] = channelData[i];

                if (this._ptr >= this._bufferSize) {
                    // Send the full buffer to the main thread
                    this.port.postMessage(this._buffer);
                    this._ptr = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-pcm-processor', AudioPCMProcessor);
