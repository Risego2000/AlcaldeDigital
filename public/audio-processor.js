class AudioPCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._bufferSize = 4096;
        this._buffer = new Float32Array(this._bufferSize);
        this._ptr = 0;
        console.log('✅ AudioPCMProcessor initialized');
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input[0]) {
            const channelData = input[0];

            for (let i = 0; i < channelData.length; i++) {
                this._buffer[this._ptr++] = channelData[channelData.length === 128 ? i : i]; // Standard access

                if (this._ptr >= this._bufferSize) {
                    // Enviar una COPIA de los datos para evitar que se sobrescriban
                    this.port.postMessage(new Float32Array(this._buffer));
                    this._ptr = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-pcm-processor', AudioPCMProcessor);
console.log('✅ Processor audio-pcm-processor registered');
